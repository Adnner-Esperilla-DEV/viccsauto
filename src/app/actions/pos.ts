"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/lib/auth";
import {
  customerDisplayName,
  GENERIC_CUSTOMER_EMAIL,
  normalizeCustomerPhone,
  splitCustomerName,
} from "@/lib/customer-identity";
import { db } from "@/lib/db";

export type PosSaleState = { error?: string };

const saleItem = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

const saleSchema = z.object({
  items: z.string().transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Carrito inválido" });
      return z.NEVER;
    }
  }).pipe(z.array(saleItem).min(1).max(100)).refine(
    (items) => new Set(items.map((item) => item.inventoryItemId)).size === items.length,
    "No se permiten productos duplicados",
  ),
  customerName: z.string().trim().max(120),
  customerEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email()]),
  customerPhone: z.string().trim().max(30).refine(
    (value) => !value || (normalizeCustomerPhone(value)?.length ?? 0) >= 8,
    "Teléfono inválido",
  ),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]),
  notes: z.string().trim().max(500),
});

type PosCustomerInput = Pick<z.infer<typeof saleSchema>, "customerName" | "customerEmail" | "customerPhone">;

async function resolvePosCustomer(tx: Prisma.TransactionClient, input: PosCustomerInput) {
  const email = input.customerEmail || null;
  const phoneNormalized = normalizeCustomerPhone(input.customerPhone);

  if (!email && !phoneNormalized) {
    const customer = await tx.user.upsert({
      where: { email: GENERIC_CUSTOMER_EMAIL },
      update: { firstName: "Cliente", lastName: "Genérico", role: "CUSTOMER", status: "SYSTEM" },
      create: {
        email: GENERIC_CUSTOMER_EMAIL,
        passwordHash: `SYSTEM:${randomUUID()}`,
        firstName: "Cliente",
        lastName: "Genérico",
        role: "CUSTOMER",
        status: "SYSTEM",
      },
    });
    return {
      customer,
      customerName: input.customerName || customerDisplayName(customer),
      customerEmail: GENERIC_CUSTOMER_EMAIL,
      customerPhone: input.customerPhone || "Sin teléfono",
    };
  }

  const [byEmail, byPhone] = await Promise.all([
    email ? tx.user.findUnique({ where: { email } }) : null,
    phoneNormalized ? tx.user.findUnique({ where: { phoneNormalized } }) : null,
  ]);
  if (byEmail && byPhone && byEmail.id !== byPhone.id) throw new Error("CUSTOMER_IDENTITY_CONFLICT");

  let customer = byEmail ?? byPhone;
  const suppliedName = splitCustomerName(input.customerName);
  if (customer) {
    const canRefreshProfile = customer.status === "POS_ONLY";
    customer = await tx.user.update({
      where: { id: customer.id },
      data: {
        ...(canRefreshProfile && input.customerName ? suppliedName : {}),
        ...(canRefreshProfile && email ? { email } : {}),
        ...((canRefreshProfile || !customer.phone) && input.customerPhone
          ? { phone: input.customerPhone, phoneNormalized }
          : {}),
      },
    });
  } else {
    customer = await tx.user.create({
      data: {
        email: email ?? `pos-${randomUUID()}@viccsauto.local`,
        passwordHash: `POS_ONLY:${randomUUID()}`,
        ...suppliedName,
        phone: input.customerPhone || null,
        phoneNormalized,
        role: "CUSTOMER",
        status: "POS_ONLY",
      },
    });
  }

  return {
    customer,
    customerName: customerDisplayName(customer),
    customerEmail: customer.email,
    customerPhone: customer.phone || "Sin teléfono",
  };
}

export async function createPosSaleAction(_previous: PosSaleState, formData: FormData): Promise<PosSaleState> {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/auth/login");

  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa los productos y los datos de la venta." };

  const input = parsed.data;
  const number = `POS-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;

  try {
    await db.$transaction(async (tx) => {
      const inventory = await tx.inventoryItem.findMany({
        where: { id: { in: input.items.map((item) => item.inventoryItemId) } },
        include: { product: true, location: true },
      });
      if (inventory.length !== input.items.length) throw new Error("ITEM_NOT_FOUND");

      const lines = input.items.map((requested) => {
        const stockItem = inventory.find((item) => item.id === requested.inventoryItemId);
        if (!stockItem || !stockItem.product.isActive) throw new Error("PRODUCT_UNAVAILABLE");
        if (stockItem.quantity - stockItem.reserved < requested.quantity) throw new Error("STOCK_UNAVAILABLE");
        return { stockItem, quantity: requested.quantity };
      });

      const subtotal = lines.reduce((sum, line) => sum + line.stockItem.product.price * line.quantity, 0);
      const resolvedCustomer = await resolvePosCustomer(tx, input);
      const order = await tx.order.create({
        data: {
          number,
          checkoutToken: randomUUID(),
          userId: resolvedCustomer.customer.id,
          customerName: resolvedCustomer.customerName,
          customerEmail: resolvedCustomer.customerEmail,
          customerPhone: resolvedCustomer.customerPhone,
          channel: "POS",
          status: "COMPLETED",
          paymentStatus: "PAID",
          fulfillmentStatus: "DELIVERED",
          subtotal,
          total: subtotal,
          shippingAddress: `Venta presencial · ${[...new Set(lines.map((line) => line.stockItem.location.name))].join(", ")}`,
          notes: input.notes || null,
          items: {
            create: lines.map(({ stockItem, quantity }) => ({
              productId: stockItem.productId,
              sku: stockItem.product.sku,
              name: stockItem.product.name,
              quantity,
              unitPrice: stockItem.product.price,
              total: stockItem.product.price * quantity,
            })),
          },
          payments: {
            create: {
              provider: `POS_${input.paymentMethod}`,
              providerId: number,
              status: "PAID",
              amount: subtotal,
              currency: "CLP",
              metadata: JSON.stringify({ cashierId: user!.id, method: input.paymentMethod }),
            },
          },
          shipments: {
            create: { provider: "STORE_COUNTER", status: "DELIVERED", deliveredAt: new Date() },
          },
        },
      });

      for (const { stockItem, quantity } of lines) {
        const updatedInventory = await tx.inventoryItem.updateMany({
          where: { id: stockItem.id, quantity: { gte: stockItem.reserved + quantity } },
          data: { quantity: { decrement: quantity } },
        });
        const updatedProduct = await tx.product.updateMany({
          where: { id: stockItem.productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updatedInventory.count !== 1 || updatedProduct.count !== 1) throw new Error("STOCK_UNAVAILABLE");
        await tx.inventoryMovement.create({
          data: {
            locationId: stockItem.locationId,
            productId: stockItem.productId,
            type: "SALE",
            quantity: -quantity,
            reference: number,
            reason: "Venta presencial",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user!.id,
          action: "CREATE_POS_SALE",
          entity: "Order",
          entityId: order.id,
          details: JSON.stringify({ number, paymentMethod: input.paymentMethod, total: subtotal, customerId: resolvedCustomer.customer.id }),
        },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    console.error("No se pudo registrar la venta presencial", error instanceof Error ? error.message : "UNKNOWN");
    if (error instanceof Error && error.message === "STOCK_UNAVAILABLE") {
      return { error: "El stock cambió mientras registrabas la venta. Actualiza la página y revisa las cantidades." };
    }
    if (error instanceof Error && error.message === "CUSTOMER_IDENTITY_CONFLICT") {
      return { error: "El correo y el teléfono pertenecen a clientes distintos. Revisa los datos antes de continuar." };
    }
    return { error: "No se pudo registrar la venta. Intenta nuevamente." };
  }

  revalidatePath("/admin/pos");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/orders");
  revalidatePath("/products");
  redirect(`/admin/pos?ok=${encodeURIComponent(number)}`);
}
