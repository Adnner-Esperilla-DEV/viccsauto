import Link from "next/link";
import { IoCalendarOutline, IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";

import { updateOrderAction } from "@/app/actions/admin";
import { AdminSelect, type AdminSelectOption } from "@/components/admin/AdminSelect";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;

type OrdersAdminPageProps = {
  searchParams: Promise<{ page?: string }>;
};

const orderStatuses: readonly AdminSelectOption[] = [
  { value: "PENDING", label: "Pendiente" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "PROCESSING", label: "En preparación" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const paymentStatuses: readonly AdminSelectOption[] = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PAID", label: "Pagado" },
  { value: "FAILED", label: "Fallido" },
  { value: "REFUNDED", label: "Reembolsado" },
];

const fulfillmentStatuses: readonly AdminSelectOption[] = [
  { value: "UNFULFILLED", label: "Sin preparar" },
  { value: "READY", label: "Listo para entregar" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
];

function orderDate(date: Date) {
  return date.toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}

function pageHref(page: number) {
  return page > 1 ? `/admin/orders?page=${page}` : "/admin/orders";
}

export default async function OrdersAdminPage({ searchParams }: OrdersAdminPageProps) {
  await requireStaff();
  const query = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const total = await db.order.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const orders = await db.order.findMany({
    include: { shipments: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <p className="font-bold uppercase tracking-widest text-blue-700">Administración</p>
          <h1 className="mt-2 text-4xl font-black">Pedidos</h1>
          <p className="mt-2 text-sm text-slate-500">{total} pedidos registrados · 15 por página</p>
        </div>
        <a href="/admin/reports/orders" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700">Exportar CSV</a>
      </div>

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <b>{order.number}</b>
                  <span className={order.channel === "POS" ? "rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700" : "rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700"}>
                    {order.channel === "POS" ? "PRESENCIAL" : "EN LÍNEA"}
                  </span>
                </div>
                <small className="mt-1 block text-slate-500">{order.customerName} · {order.customerEmail}</small>
                <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <IoCalendarOutline className="h-4 w-4" aria-hidden="true" />
                  {orderDate(order.createdAt)}
                </span>
              </div>
              <strong className="text-xl text-slate-950">{formatPrice(order.total)}</strong>
            </div>

            <form action={updateOrderAction} className="mt-6 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.25fr_1fr_auto]">
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="returnPage" value={page} />
              <AdminSelect name="status" label="Estado del pedido" defaultValue={order.status} options={orderStatuses} />
              <AdminSelect name="paymentStatus" label="Estado del pago" defaultValue={order.paymentStatus} options={paymentStatuses} />
              <AdminSelect name="fulfillmentStatus" label="Estado de entrega" defaultValue={order.fulfillmentStatus} options={fulfillmentStatuses} />
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Código de seguimiento</span>
                <input name="trackingCode" defaultValue={order.shipments[0]?.trackingCode ?? ""} placeholder="Ej. CH123456789" className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
              </label>
              <button className="min-h-11 rounded-xl bg-blue-700 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-blue-800">Actualizar</button>
            </form>
          </article>
        ))}

        {!orders.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
            Todavía no hay pedidos registrados.
          </div>
        )}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-500">Mostrando {firstResult}–{lastResult} de {total}</p>
        <nav className="flex items-center gap-2" aria-label="Paginación de pedidos">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${page === 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <IoChevronBackOutline aria-hidden="true" /> Anterior
          </Link>
          <span className="px-2 text-sm font-semibold text-slate-600">Página {page} de {totalPages}</span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${page === totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            Siguiente <IoChevronForwardOutline aria-hidden="true" />
          </Link>
        </nav>
      </footer>
    </main>
  );
}
