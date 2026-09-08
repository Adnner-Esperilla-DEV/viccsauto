import Link from "next/link";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";

import { adjustInventoryAction } from "@/app/actions/admin";
import { InventoryHistoryModal } from "@/components/admin/InventoryHistoryModal";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;
const HISTORY_PAGE_SIZE = 15;

type InventoryAdminPageProps = {
  searchParams: Promise<{ error?: string; history?: string; historyPage?: string; ok?: string; page?: string }>;
};

function pageHref(page: number) {
  return page > 1 ? `/admin/inventory?page=${page}` : "/admin/inventory";
}

function historyHref(page: number, itemId: string, historyPage = 1) {
  const params = new URLSearchParams({ history: itemId });
  if (page > 1) params.set("page", String(page));
  if (historyPage > 1) params.set("historyPage", String(historyPage));
  return `/admin/inventory?${params.toString()}`;
}

export default async function InventoryAdminPage({ searchParams }: InventoryAdminPageProps) {
  await requireStaff();
  const query = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const total = await db.inventoryItem.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const [items, historyItem] = await Promise.all([
    db.inventoryItem.findMany({
      include: { product: true, location: true },
      orderBy: { product: { name: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    query.history
      ? db.inventoryItem.findUnique({
          where: { id: query.history },
          include: { product: true, location: true },
        })
      : Promise.resolve(null),
  ]);
  const movementWhere = historyItem ? { productId: historyItem.productId, locationId: historyItem.locationId } : null;
  const movementTotal = movementWhere ? await db.inventoryMovement.count({ where: movementWhere }) : 0;
  const historyTotalPages = Math.max(1, Math.ceil(movementTotal / HISTORY_PAGE_SIZE));
  const requestedHistoryPage = Math.max(1, Number.parseInt(query.historyPage ?? "1", 10) || 1);
  const historyPage = Math.min(requestedHistoryPage, historyTotalPages);
  const movements = movementWhere
    ? await db.inventoryMovement.findMany({
        where: movementWhere,
        orderBy: { createdAt: "desc" },
        skip: (historyPage - 1) * HISTORY_PAGE_SIZE,
        take: HISTORY_PAGE_SIZE,
      })
    : [];
  const historyFirstResult = movementTotal ? (historyPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const historyLastResult = Math.min(historyPage * HISTORY_PAGE_SIZE, movementTotal);
  const administratorIds = [
    ...new Set(
      movements.flatMap((movement) => (movement.reference?.startsWith("ADMIN:") ? [movement.reference.slice(6)] : [])),
    ),
  ];
  const administrators = administratorIds.length
    ? await db.user.findMany({
        where: { id: { in: administratorIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const administratorNames = new Map(
    administrators.map((administrator) => [administrator.id, `${administrator.firstName} ${administrator.lastName}`]),
  );
  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-widest text-blue-700">Administración</p>
      <h1 className="mt-2 text-4xl font-black">Inventario</h1>
      <p className="mt-3 text-slate-600">Todo ajuste genera un movimiento y una entrada de auditoría.</p>
      <p className="mt-2 text-sm text-slate-500">{total} registros de inventario · 15 por página</p>

      {query.ok === "adjusted" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Inventario ajustado correctamente.
        </p>
      )}
      {query.error === "invalid" && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          Revisa las unidades y escribe un motivo válido.
        </p>
      )}
      {query.error === "negative" && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          El ajuste no puede dejar menos unidades que las actualmente reservadas.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {items.map((item) => {
          const available = item.quantity - item.reserved;
          return (
            <article
              key={item.id}
              className="grid items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(260px,1fr)_auto_440px]"
            >
              <div className="min-w-0">
                <b className="block truncate text-slate-950">{item.product.name}</b>
                <small className="block text-slate-500">
                  {item.product.sku} · {item.location.name}
                </small>
                <Link
                  href={historyHref(page, item.id)}
                  className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:underline"
                >
                  Ver historial
                </Link>
              </div>
              <div
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-black ${available <= item.product.lowStockAt ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {available} disponibles
              </div>
              <form
                action={adjustInventoryAction}
                className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto] md:col-span-2 xl:col-span-1"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="returnPage" value={page} />
                <input
                  required
                  type="number"
                  name="delta"
                  placeholder="+/- unidades"
                  aria-label={`Ajuste de unidades para ${item.product.name}`}
                  className="min-w-0 rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  required
                  name="reason"
                  placeholder="Motivo del ajuste"
                  aria-label={`Motivo del ajuste para ${item.product.name}`}
                  className="min-w-0 rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-bold text-white hover:bg-blue-800">
                  Ajustar
                </button>
              </form>
            </article>
          );
        })}

        {!items.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
            Todavía no hay registros de inventario.
          </div>
        )}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-500">
          Mostrando {firstResult}–{lastResult} de {total}
        </p>
        <nav className="flex items-center gap-2" aria-label="Paginación de inventario">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${page === 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <IoChevronBackOutline aria-hidden="true" /> Anterior
          </Link>
          <span className="px-2 text-sm font-semibold text-slate-600">
            Página {page} de {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${page === totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            Siguiente <IoChevronForwardOutline aria-hidden="true" />
          </Link>
        </nav>
      </footer>

      {historyItem && (
        <InventoryHistoryModal
          inventory={{
            productName: historyItem.product.name,
            sku: historyItem.product.sku,
            location: historyItem.location.name,
          }}
          movements={movements.map((movement) => ({
            id: movement.id,
            type: movement.type,
            quantity: movement.quantity,
            reason: movement.reason,
            reference: movement.reference?.startsWith("ADMIN:")
              ? (administratorNames.get(movement.reference.slice(6)) ?? "Administrador")
              : movement.reference,
            createdAt: movement.createdAt.toISOString(),
          }))}
          closeHref={pageHref(page)}
          pagination={{
            page: historyPage,
            totalPages: historyTotalPages,
            total: movementTotal,
            firstResult: historyFirstResult,
            lastResult: historyLastResult,
            previousHref: historyHref(page, historyItem.id, Math.max(1, historyPage - 1)),
            nextHref: historyHref(page, historyItem.id, Math.min(historyTotalPages, historyPage + 1)),
          }}
        />
      )}
    </main>
  );
}
