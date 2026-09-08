import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IoCalendarOutline,
  IoCartOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoReceiptOutline,
} from "react-icons/io5";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

const orderLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PROCESSING: "En preparación",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};
const paymentLabels: Record<string, string> = {
  PENDING: "Pago pendiente",
  PAID: "Pagado",
  FAILED: "Pago fallido",
  REFUNDED: "Reembolsado",
};

function statusStyle(status: string) {
  if (["COMPLETED", "PAID"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["CANCELLED", "FAILED", "REFUNDED"].includes(status)) return "bg-red-50 text-red-700 ring-red-200";
  if (["CONFIRMED", "PROCESSING"].includes(status)) return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function pageHref(page: number) {
  return page > 1 ? `/orders?page=${page}` : "/orders";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const requestedPage = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const total = await db.order.count({ where: { userId: user.id } });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (requestedPage > totalPages) redirect(pageHref(totalPages));
  const page = requestedPage;
  const orders = await db.order.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      number: true,
      channel: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const firstItem = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-bold uppercase tracking-[0.18em] text-blue-700">Mi cuenta</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Mis pedidos</h1>
          <p className="mt-3 text-slate-600">Consulta tus compras, pagos y el estado de cada entrega.</p>
        </div>
        {total > 0 && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-right">
            <span className="block text-xs font-bold uppercase tracking-wide text-blue-700">Pedidos registrados</span>
            <strong className="text-2xl font-black text-blue-700">{total}</strong>
          </div>
        )}
      </header>

      {orders.length ? (
        <section className="mt-9 grid gap-4" aria-label="Listado de pedidos">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                    <IoReceiptOutline className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-black text-slate-950">{order.number}</h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${statusStyle(order.status)}`}
                      >
                        {orderLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <IoCalendarOutline aria-hidden="true" />
                      {order.createdAt.toLocaleString("es-CL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Santiago",
                      })}
                    </p>
                  </div>
                </div>
                <IoChevronForwardOutline
                  className="mt-3 h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-700"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Canal</span>
                  <b className="mt-1 block text-sm text-slate-700">
                    {order.channel === "POS" ? "Venta presencial" : "Compra en línea"}
                  </b>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pago</span>
                  <b
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${statusStyle(order.paymentStatus)}`}
                  >
                    {paymentLabels[order.paymentStatus] ?? order.paymentStatus}
                  </b>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Productos</span>
                  <b className="mt-1 block text-sm text-slate-700">
                    {order._count.items} {order._count.items === 1 ? "producto" : "productos"}
                  </b>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</span>
                  <strong className="mt-1 block text-xl font-black text-blue-700">{formatPrice(order.total)}</strong>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-blue-700">
            <IoCartOutline className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-black">Aún no tienes pedidos</h2>
          <p className="mt-2 text-slate-500">Cuando realices una compra, podrás seguirla desde aquí.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-full bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-800"
          >
            Explorar catálogo
          </Link>
        </section>
      )}

      {total > 0 && (
        <nav
          aria-label="Paginación de pedidos"
          className="mt-7 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
        >
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <strong className="text-slate-800">
              {firstItem}–{lastItem}
            </strong>{" "}
            de <strong className="text-slate-800">{total}</strong> pedidos
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <IoChevronBackOutline aria-hidden="true" />
                Anterior
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-300"
              >
                <IoChevronBackOutline aria-hidden="true" />
                Anterior
              </span>
            )}
            <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                Siguiente
                <IoChevronForwardOutline aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-300"
              >
                Siguiente
                <IoChevronForwardOutline aria-hidden="true" />
              </span>
            )}
          </div>
        </nav>
      )}
    </main>
  );
}
