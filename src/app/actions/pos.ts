"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/lib/auth";
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
  customerPhone: z.string().trim().max(30),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]),
  notes: z.string().trim().max(500),
});

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
      const order = await tx.order.create({
        data: {
          number,
          checkoutToken: randomUUID(),
          customerName: input.customerName || "Cliente presencial",
          customerEmail: input.customerEmail || "presencial@viccsauto.local",
          customerPhone: input.customerPhone || "Sin teléfono",
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
          details: JSON.stringify({ number, paymentMethod: input.paymentMethod, total: subtotal }),
        },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    console.error("No se pudo registrar la venta presencial", error instanceof Error ? error.message : "UNKNOWN");
    if (error instanceof Error && error.message === "STOCK_UNAVAILABLE") {
      return { error: "El stock cambió mientras registrabas la venta. Actualiza la página y revisa las cantidades." };
    }
    return { error: "No se pudo registrar la venta. Intenta nuevamente." };
  }

  revalidatePath("/admin/pos");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/orders");
  revalidatePath("/products");
  redirect(`/admin/pos?ok=${encodeURIComponent(number)}`);
}
