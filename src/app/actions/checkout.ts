"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { CART_COOKIE, readCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { calculateTotals, DELIVERY_ZONES, type DeliveryZone } from "@/lib/pricing";
import { logMailProvider, manualPaymentProvider } from "@/lib/providers";
import { memoryRateLimit } from "@/lib/rate-limit";
import { getCustomsTaxRateBps } from "@/lib/store-settings";

const schema = z.object({
  checkoutToken: z.string().uuid(),
  customerName: z.string().trim().min(3).max(120),
  customerEmail: z.string().trim().toLowerCase().email(),
  customerPhone: z.string().trim().min(8).max(30),
  delivery: z.enum(["pickup", "shipping"]),
  destinationZone: z.enum(DELIVERY_ZONES),
  line1: z.string().trim().max(160).optional(),
  commune: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function checkoutAction(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await memoryRateLimit.consume(`checkout:${ip}`, 6, 15 * 60_000))) redirect("/checkout?error=rate");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/checkout?error=invalid");
  const input = parsed.data;
  const deliveryZone: DeliveryZone = input.delivery === "pickup" ? "PICKUP_ARICA" : input.destinationZone;
  if (input.delivery === "shipping" && deliveryZone === "PICKUP_ARICA") redirect("/checkout?error=destination");
  if (input.delivery === "shipping" && (!input.line1 || !input.commune || !input.city || !input.region))
    redirect("/checkout?error=address");
  const previous = await db.order.findUnique({ where: { checkoutToken: input.checkoutToken }, select: { id: true } });
  if (previous) redirect(`/orders/${previous.id}?created=1`);
  const cart = await readCart();
  if (!cart || cart.items.length === 0) redirect("/cart?error=empty");
  const user = await getSessionUser();
  const configuredTaxRateBps = await getCustomsTaxRateBps();
  const totals = calculateTotals(cart.items, deliveryZone, configuredTaxRateBps);
  const appliedTaxRateBps = deliveryZone === "REST_OF_CHILE" ? configuredTaxRateBps : 0;
  const deliveryNote =
    deliveryZone === "PICKUP_ARICA"
      ? "Retiro en tienda de Arica, sin envío."
      : deliveryZone === "ARICA"
        ? "Despacho gratuito en Arica."
        : "El transporte se paga al transportista al recibir.";
  const number = `VIC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const shippingLocation =
    deliveryZone === "ARICA"
      ? { commune: "Arica", city: "Arica", region: "Arica y Parinacota" }
      : deliveryZone === "IQUIQUE"
        ? { commune: "Iquique", city: "Iquique", region: "Tarapacá" }
        : { commune: input.commune, city: input.city, region: input.region };
  const address =
    input.delivery === "pickup"
      ? JSON.stringify({
          type: "PICKUP",
          destinationZone: deliveryZone,
          label: "Retiro en tienda ViccsAuto, Arica",
          city: "Arica",
          region: "Arica y Parinacota",
          taxRateBps: 0,
          shippingPayment: "NONE",
        })
      : JSON.stringify({
          type: "SHIPPING",
          destinationZone: deliveryZone,
          line1: input.line1,
          ...shippingLocation,
          country: "CL",
          taxRateBps: appliedTaxRateBps,
          taxLabel: appliedTaxRateBps ? "Tributos de internación estimados" : "Sin tributos adicionales",
          shippingPayment: deliveryZone === "ARICA" ? "FREE" : "PAY_AT_DESTINATION",
        });
  let orderId: string;
  try {
    orderId = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: cart.items.map((item) => item.productId) }, isActive: true },
      });
      if (products.length !== cart.items.length) throw new Error("PRODUCT_UNAVAILABLE");
      for (const item of cart.items) {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product || product.price !== item.unitPrice || product.stock < item.quantity)
          throw new Error("CART_CHANGED");
        const updated = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new Error("STOCK_UNAVAILABLE");
        const inventory = await tx.inventoryItem.findFirst({
          where: { productId: product.id, quantity: { gte: item.quantity } },
          orderBy: { quantity: "desc" },
        });
        if (!inventory) throw new Error("STOCK_UNAVAILABLE");
        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            locationId: inventory.locationId,
            productId: product.id,
            type: "SALE",
            quantity: -item.quantity,
            reference: number,
            reason: "Pedido ecommerce",
          },
        });
      }
      const shipmentProvider =
        deliveryZone === "PICKUP_ARICA" ? "STORE_PICKUP" : deliveryZone === "ARICA" ? "LOCAL_FREE" : "FREIGHT_COLLECT";
      const order = await tx.order.create({
        data: {
          number,
          checkoutToken: input.checkoutToken,
          userId: user?.id,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          ...totals,
          shippingAddress: address,
          notes: input.notes || null,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              sku: item.product.sku,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.unitPrice * item.quantity,
            })),
          },
          payments: {
            create: {
              provider: manualPaymentProvider.name,
              providerId: `manual-${number}`,
              status: "PENDING",
              amount: totals.total,
              currency: "CLP",
              metadata: JSON.stringify({
                deliveryZone,
                taxRateBps: appliedTaxRateBps,
                shippingPayment:
                  deliveryZone === "ARICA" ? "FREE" : deliveryZone === "PICKUP_ARICA" ? "NONE" : "PAY_AT_DESTINATION",
              }),
            },
          },
          shipments: { create: { provider: shipmentProvider, status: "PENDING" } },
        },
      });
      await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });
      return order.id;
    });
  } catch (error) {
    console.error("No se pudo crear el pedido", error instanceof Error ? error.message : "UNKNOWN");
    redirect("/checkout?error=stock");
  }
  const jar = await cookies();
  jar.delete(CART_COOKIE);
  jar.set("viccs_order_access", `${orderId}.${input.checkoutToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/orders/${orderId}`,
    maxAge: 60 * 60 * 24 * 7,
  });
  await logMailProvider.send({
    to: input.customerEmail,
    subject: `Pedido ${number} recibido`,
    text: `Recibimos tu pedido por ${totals.total} CLP. Tributos de internación: ${totals.taxTotal} CLP. ${deliveryNote} El pago manual está pendiente de confirmación.`,
  });
  redirect(`/orders/${orderId}?created=1`);
}
