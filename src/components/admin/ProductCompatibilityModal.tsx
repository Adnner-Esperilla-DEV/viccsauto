"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoCloseOutline } from "react-icons/io5";

import { addProductCompatibilityAction, removeProductCompatibilityAction } from "@/app/actions/admin";
import { VehicleCompatibilityFields } from "@/components/automotive/VehicleCompatibilityFields";

type CompatibilityItem = {
  id: string;
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
  engine: string | null;
  notes: string | null;
};

type ProductCompatibilityModalProps = {
  product: { id: string; name: string; sku: string };
  makes: Array<{ id: string; name: string }>;
  years: number[];
  items: CompatibilityItem[];
  closeHref: string;
  listPage: number;
  listQuery: string;
  error?: string;
  success?: boolean;
};

export function ProductCompatibilityModal({
  product,
  makes,
  years,
  items,
  closeHref,
  listPage,
  listQuery,
  error,
  success,
}: ProductCompatibilityModalProps) {
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

  const returnFields = (
    <>
      <input type="hidden" name="returnTo" value="list" />
      <input type="hidden" name="listPage" value={listPage} />
      <input type="hidden" name="listQuery" value={listQuery} />
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`compatibility-${product.id}`}
        className="my-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Compatibilidad vehicular</p>
            <h2 id={`compatibility-${product.id}`} className="mt-1 text-2xl font-black text-slate-950">
              {product.name}
            </h2>
            <p className="mt-1 text-sm font-normal text-slate-500">
              {product.sku} · {items.length} registros
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar modal"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <IoCloseOutline className="h-6 w-6" />
          </button>
        </header>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-6 sm:px-8">
          {error && (
            <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              Compatibilidad actualizada correctamente.
            </p>
          )}

          <form
            action={addProductCompatibilityAction}
            className="grid gap-4 rounded-2xl border border-slate-200 p-5 md:grid-cols-2"
          >
            <input type="hidden" name="productId" value={product.id} />
            {returnFields}
            <VehicleCompatibilityFields makes={makes} />
            <label className="grid gap-1 text-sm font-bold">
              Desde el año
              <select required name="yearFrom" className="rounded-xl border bg-white p-3 font-normal">
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Hasta el año
              <select required name="yearTo" className="rounded-xl border bg-white p-3 font-normal">
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <input name="engine" placeholder="Motor opcional, ej. 2.0" className="rounded-xl border p-3" />
            <input name="notes" placeholder="Notas opcionales" className="rounded-xl border p-3" />
            <button className="rounded-xl bg-blue-700 p-3 font-bold text-white md:col-span-2">
              Agregar compatibilidad
            </button>
          </form>

          <div className="mt-7">
            <h3 className="text-xl font-black">Compatibilidades registradas</h3>
            {items.length ? (
              <div className="mt-3 divide-y divide-slate-100">
                {items.map((item) => (
                  <article key={item.id} className="flex flex-wrap items-center gap-4 py-4">
                    <div className="mr-auto">
                      <b>
                        {item.make} {item.model}
                      </b>
                      <span className="block text-sm text-slate-600">
                        {item.yearFrom ?? "Sin año inicial"}–{item.yearTo ?? "Sin año final"}
                        {item.engine ? ` · Motor ${item.engine}` : ""}
                      </span>
                      {item.notes && <small className="text-slate-500">{item.notes}</small>}
                    </div>
                    <form action={removeProductCompatibilityAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="productId" value={product.id} />
                      {returnFields}
                      <button className="font-bold text-red-700 hover:underline">Eliminar</button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-800">
                Este producto aún no tiene compatibilidades.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
