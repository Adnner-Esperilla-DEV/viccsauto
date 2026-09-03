import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { IoArrowBackOutline, IoBagCheckOutline, IoCardOutline, IoCarOutline, IoCubeOutline, IoLocationOutline, IoReceiptOutline, IoStorefrontOutline, IoTimeOutline } from "react-icons/io5";

import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

type StoredAddress = { type?: string; label?: string; line1?: string; commune?: string; city?: string; region?: string; shippingPayment?: string; taxRateBps?: number; locations?: string[] };

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmado", PROCESSING: "En preparación", COMPLETED: "Completado", CANCELLED: "Cancelado",
  PAID: "Pagado", FAILED: "Pago fallido", REFUNDED: "Reembolsado",
  UNFULFILLED: "Sin preparar", READY: "Listo para entregar", SHIPPED: "Enviado", DELIVERED: "Entregado",
};

function statusStyle(status: string) {
  if (["COMPLETED", "PAID", "DELIVERED"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["CANCELLED", "FAILED", "REFUNDED"].includes(status)) return "bg-red-50 text-red-700 ring-red-200";
  if (["CONFIRMED", "READY", "SHIPPED"].includes(status)) return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function StatusCard({ icon, label, status }: { icon: ReactNode; label: string; status: string }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-xl text-blue-700">{icon}</span><span className="text-sm font-semibold text-slate-500">{label}</span></div>
    <span className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-sm font-black ring-1 ring-inset ${statusStyle(status)}`}>{statusLabels[status] ?? status}</span>
  </article>;
}

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const [order, user, query] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: true, payments: true, shipments: true } }),
    getSessionUser(),
    searchParams,
  ]);
  if (!order) notFound();
  const guestAllowed = jar.get("viccs_order_access")?.value === `${order.id}.${order.checkoutToken}`;
  if (!(isStaff(user) || (user && order.userId === user.id) || (!order.userId && guestAllowed))) notFound();

  let address: StoredAddress = {};
  try { address = JSON.parse(order.shippingAddress) as StoredAddress; } catch { address = { label: order.shippingAddress }; }
  const isPickup = address.type === "PICKUP" || address.type === "POS";
  const deliveryText = address.type === "PICKUP" ? "Retiro en tienda ViccsAuto, Arica"
    : address.type === "POS" ? `${address.label ?? "Venta presencial en Arica"}${address.locations?.length ? ` · ${address.locations.join(", ")}` : ""}`
      : [address.line1, address.commune, address.city, address.region].filter(Boolean).join(", ");
  const shippingText = address.shippingPayment === "PAY_AT_DESTINATION" ? "Por pagar en destino"
    : address.shippingPayment === "FREE" ? "Gratis"
      : address.shippingPayment === "NONE" ? "Sin envío" : formatPrice(order.shippingTotal);
  const orderDate = order.createdAt.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" });
  const backHref = isStaff(user) ? "/admin/orders" : user ? "/orders" : "/products";
  const backLabel = isStaff(user) ? "Volver a pedidos" : user ? "Mis pedidos" : "Seguir comprando";

  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-700"><IoArrowBackOutline aria-hidden="true"/> {backLabel}</Link>
    {query.created && <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><IoBagCheckOutline className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true"/><div><b className="block">Pedido creado correctamente</b><span className="text-sm">Te contactaremos para confirmar el pago y los siguientes pasos.</span></div></div>}

    <header className="mt-7 flex flex-wrap items-end justify-between gap-5">
      <div><p className="font-bold uppercase tracking-[0.18em] text-blue-700">{order.channel === "POS" ? "Venta presencial" : "Compra en línea"}</p><h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Detalle del pedido</h1><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500"><b className="text-slate-700">{order.number}</b><span className="flex items-center gap-1.5"><IoTimeOutline aria-hidden="true"/> {orderDate}</span></div></div>
      <div className="rounded-2xl bg-blue-50 px-5 py-3 text-right"><span className="block text-xs font-bold uppercase tracking-wide text-blue-700">Total</span><strong className="text-3xl font-black text-blue-700">{formatPrice(order.total)}</strong></div>
    </header>

    <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Estados del pedido">
      <StatusCard icon={<IoReceiptOutline/>} label="Estado del pedido" status={order.status}/>
      <StatusCard icon={<IoCardOutline/>} label="Estado del pago" status={order.paymentStatus}/>
      <StatusCard icon={<IoCubeOutline/>} label="Estado de entrega" status={order.fulfillmentStatus}/>
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><IoBagCheckOutline className="h-6 w-6" aria-hidden="true"/></span><div><h2 className="text-2xl font-black">Productos</h2><p className="text-sm text-slate-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} unidades en este pedido</p></div></div>
        <ul className="mt-5 divide-y divide-slate-100">{order.items.map((item) => <li key={item.id} className="grid items-center gap-3 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <span className="grid h-11 min-w-11 place-items-center rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-700">{item.quantity}×</span>
          <div className="min-w-0"><b className="block text-slate-900">{item.name}</b><small className="mt-1 block text-slate-500">SKU {item.sku} · {formatPrice(item.unitPrice)} c/u</small></div>
          <strong className="text-right text-slate-950">{formatPrice(item.total)}</strong>
        </li>)}</ul>
      </section>

      <aside className="h-fit rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-7 shadow-lg">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Resumen</p><h2 className="mt-1 text-2xl font-black">Total del pedido</h2>
        <dl className="mt-6 space-y-4 text-sm text-slate-600"><div className="flex justify-between gap-4"><dt>Subtotal</dt><dd className="font-bold text-slate-900">{formatPrice(order.subtotal)}</dd></div><div className="flex justify-between gap-4"><dt>Tributos de internación</dt><dd className="font-bold text-slate-900">{formatPrice(order.taxTotal)}</dd></div>{address.taxRateBps ? <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Tasa estimada aplicada: {(address.taxRateBps / 100).toLocaleString("es-CL", { minimumFractionDigits: 2 })}%</div> : null}<div className="flex justify-between gap-4"><dt>Despacho</dt><dd className="text-right font-bold text-slate-900">{shippingText}</dd></div><div className="flex items-end justify-between gap-4 border-t border-blue-100 pt-5"><dt className="font-bold text-slate-900">Total pagado a ViccsAuto</dt><dd className="text-3xl font-black text-blue-700">{formatPrice(order.total)}</dd></div></dl>
      </aside>
    </div>

    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">{isPickup ? <IoStorefrontOutline className="h-6 w-6"/> : <IoCarOutline className="h-6 w-6"/>}</span><div><p className="text-sm font-semibold text-slate-500">Modalidad de entrega</p><h2 className="text-xl font-black">{isPickup ? "Retiro presencial" : "Despacho"}</h2></div></div>
        <div className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><IoLocationOutline className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true"/><p>{deliveryText || "Dirección no disponible"}</p></div>
        {address.shippingPayment === "PAY_AT_DESTINATION" && <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">El transporte no está incluido en el total. Se paga directamente al transportista al recibir.</p>}
        {order.shipments[0]?.trackingCode && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Código de seguimiento</span><b className="mt-1 block break-all text-emerald-900">{order.shipments[0].trackingCode}</b></div>}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><IoCardOutline className="h-6 w-6" aria-hidden="true"/></span><div><p className="text-sm font-semibold text-slate-500">Comprador</p><h2 className="text-xl font-black">Datos de contacto</h2></div></div>
        <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Nombre</dt><dd className="mt-1 font-bold text-slate-900">{order.customerName}</dd></div><div><dt className="text-slate-500">Correo</dt><dd className="mt-1 break-all font-bold text-slate-900">{order.customerEmail}</dd></div><div><dt className="text-slate-500">Teléfono</dt><dd className="mt-1 font-bold text-slate-900">{order.customerPhone}</dd></div></dl>
        {order.notes && <div className="mt-5 border-t border-slate-100 pt-5"><span className="text-sm text-slate-500">Notas del pedido</span><p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{order.notes}</p></div>}
      </section>
    </div>
  </main>;
}
