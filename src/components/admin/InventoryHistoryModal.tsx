"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoChevronBackOutline, IoChevronForwardOutline, IoCloseOutline, IoTimeOutline } from "react-icons/io5";

type InventoryHistoryModalProps = {
  inventory: {
    productName: string;
    sku: string;
    location: string;
  };
  movements: Array<{
    id: string;
    type: string;
    quantity: number;
    reason: string | null;
    reference: string | null;
    createdAt: string;
  }>;
  closeHref: string;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    firstResult: number;
    lastResult: number;
    previousHref: string;
    nextHref: string;
  };
};

const typeLabels: Record<string, string> = {
  INITIAL: "Stock inicial",
  ADJUSTMENT: "Ajuste manual",
  SALE: "Venta",
};

function movementDate(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}

export function InventoryHistoryModal({ inventory, movements, closeHref, pagination }: InventoryHistoryModalProps) {
  const router = useRouter();
  const close = () => router.push(closeHref);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(closeHref);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeHref, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="inventory-history-title" className="my-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Historial de inventario</p>
            <h2 id="inventory-history-title" className="mt-1 text-2xl font-black text-slate-950">{inventory.productName}</h2>
            <p className="mt-1 text-sm text-slate-500">{inventory.sku} · {inventory.location} · {pagination.total} movimientos</p>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar historial" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <IoCloseOutline className="h-6 w-6" />
          </button>
        </header>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-6 sm:px-8">
          {movements.length ? (
            <div className="divide-y divide-slate-100">
              {movements.map((movement) => (
                <article key={movement.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{typeLabels[movement.type] ?? movement.type}</span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><IoTimeOutline className="h-4 w-4" aria-hidden="true" />{movementDate(movement.createdAt)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-800">{movement.reason ?? "Sin motivo registrado"}</p>
                    {movement.reference && <small className="mt-1 block text-slate-500">Referencia: {movement.reference}</small>}
                  </div>
                  <strong className={`text-xl ${movement.quantity > 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">Este producto todavía no tiene movimientos registrados.</div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8">
          <p className="text-sm text-slate-500">Mostrando {pagination.firstResult}–{pagination.lastResult} de {pagination.total}</p>
          <nav className="flex items-center gap-2" aria-label="Paginación del historial de inventario">
            <Link
              href={pagination.previousHref}
              aria-disabled={pagination.page === 1}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-bold ${pagination.page === 1 ? "pointer-events-none border-slate-200 bg-white text-slate-300" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              <IoChevronBackOutline aria-hidden="true" /> Anterior
            </Link>
            <span className="px-1 text-sm font-semibold text-slate-600">{pagination.page} de {pagination.totalPages}</span>
            <Link
              href={pagination.nextHref}
              aria-disabled={pagination.page === pagination.totalPages}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-bold ${pagination.page === pagination.totalPages ? "pointer-events-none border-slate-200 bg-white text-slate-300" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              Siguiente <IoChevronForwardOutline aria-hidden="true" />
            </Link>
          </nav>
        </footer>
      </section>
    </div>
  );
}
