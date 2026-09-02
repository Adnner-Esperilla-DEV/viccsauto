import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const [order, user, query, access] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true, payments: true, shipments: true } }), getSessionUser(), searchParams, (await cookies()).get("viccs_order_access")?.value]);
  if (!order) notFound();
  const guestAllowed = access === `${order.id}.${order.checkoutToken}`;
  if (!(isStaff(user) || (user && order.userId === user.id) || (!order.userId && guestAllowed))) notFound();
  let address: Record<string, string> = {};
  try { address = JSON.parse(order.shippingAddress) as Record<string, string>; } catch {}
  return <main className="mx-auto max-w-5xl px-6 py-14">{query.created && <p className="mb-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Pedido creado correctamente. Te contactaremos para confirmar el pago.</p>}<p className="font-bold uppercase tracking-widest text-blue-700">Pedido {order.number}</p><h1 className="mt-2 text-5xl font-black">Detalle del pedido</h1><div className="mt-8 grid gap-6 md:grid-cols-3"><div className="rounded-3xl bg-white p-6"><span className="text-sm text-slate-500">Pedido</span><strong className="mt-1 block">{order.status}</strong></div><div className="rounded-3xl bg-white p-6"><span className="text-sm text-slate-500">Pago</span><strong className="mt-1 block">{order.paymentStatus}</strong></div><div className="rounded-3xl bg-white p-6"><span className="text-sm text-slate-500">Entrega</span><strong className="mt-1 block">{order.fulfillmentStatus}</strong></div></div><section className="mt-6 rounded-3xl border bg-white p-7"><h2 className="text-2xl font-black">Productos</h2><ul className="mt-5 divide-y">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-4 py-4"><span>{item.quantity} × {item.name}<small className="block text-slate-500">{item.sku}</small></span><b>{formatPrice(item.total)}</b></li>)}</ul><dl className="ml-auto mt-5 max-w-sm space-y-2 border-t pt-5"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Envío</dt><dd>{formatPrice(order.shippingTotal)}</dd></div><div className="flex justify-between text-xl font-black"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div></dl></section><section className="mt-6 rounded-3xl bg-slate-950 p-7 text-white"><h2 className="text-xl font-black">Entrega</h2><p className="mt-3 text-slate-300">{address.type === "PICKUP" ? "Retiro en tienda ViccsAuto" : `${address.line1 ?? ""}, ${address.commune ?? ""}, ${address.city ?? ""}`}</p>{order.shipments[0]?.trackingCode && <p className="mt-2">Seguimiento: <b>{order.shipments[0].trackingCode}</b></p>}</section></main>;
}
