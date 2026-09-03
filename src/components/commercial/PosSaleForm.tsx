"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { IoCheckmarkOutline, IoChevronDownOutline } from "react-icons/io5";
import { createPosSaleAction, type PosSaleState } from "@/app/actions/pos";

export type PosProduct = {
  inventoryItemId: string;
  productId: string;
  sku: string;
  name: string;
  brand?: string;
  imageId?: string;
  price: number;
  available: number;
  location: string;
};

type SaleLine = { inventoryItemId: string; quantity: number };

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const paymentMethods = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Otro" },
] as const;

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ProductThumbnail({ product, compact = false }: { product: PosProduct; compact?: boolean }) {
  const sizeClass = compact ? "h-12 w-16" : "h-14 w-[72px]";

  return product.imageId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/product-images/${product.imageId}`}
      alt={`Portada de ${product.name}`}
      className={`${sizeClass} shrink-0 rounded-xl border border-slate-200 bg-white object-contain`}
    />
  ) : (
    <span className={`${sizeClass} grid shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-1 text-center text-[10px] font-bold uppercase leading-tight text-slate-400`}>
      Sin foto
    </span>
  );
}

function PaymentMethodSelect() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<(typeof paymentMethods)[number]["value"]>("CASH");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = paymentMethods.find((method) => method.value === value) ?? paymentMethods[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="paymentMethod" value={value} />
      <button
        type="button"
        aria-label={`Medio de pago: ${selected.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="payment-method-options"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 ${open ? "border-blue-600 ring-4 ring-blue-100" : "border-slate-300 hover:border-slate-400"}`}
      >
        <span>{selected.label}</span>
        <IoChevronDownOutline className={`h-5 w-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id="payment-method-options" role="listbox" aria-label="Medio de pago" className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
          {paymentMethods.map((method) => {
            const active = method.value === value;
            return (
              <button
                key={method.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setValue(method.value); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"}`}
              >
                <span>{method.label}</span>
                {active && <IoCheckmarkOutline className="h-5 w-5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PosSaleForm({ products }: { products: PosProduct[] }) {
  const [state, formAction, pending] = useActionState<PosSaleState, FormData>(createPosSaleAction, {});
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [lines, setLines] = useState<SaleLine[]>([]);

  const matches = useMemo(() => {
    const term = normalized(search);
    if (!term) return [];
    return products
      .filter((product) => normalized(`${product.sku} ${product.name} ${product.brand ?? ""} ${product.location}`).includes(term))
      .slice(0, 8);
  }, [products, search]);

  const saleLines = lines.flatMap((line) => {
    const product = products.find((candidate) => candidate.inventoryItemId === line.inventoryItemId);
    return product ? [{ ...line, product }] : [];
  });
  const total = saleLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  function addProduct(product: PosProduct) {
    setLines((current) => {
      const existing = current.find((line) => line.inventoryItemId === product.inventoryItemId);
      if (existing) {
        return current.map((line) => line.inventoryItemId === product.inventoryItemId
          ? { ...line, quantity: Math.min(line.quantity + 1, product.available) }
          : line);
      }
      return [...current, { inventoryItemId: product.inventoryItemId, quantity: 1 }];
    });
    setSearch("");
    setSearchOpen(false);
  }

  function changeQuantity(inventoryItemId: string, quantity: number, maximum: number) {
    setLines((current) => current.map((line) => line.inventoryItemId === inventoryItemId
      ? { ...line, quantity: Math.max(1, Math.min(quantity || 1, maximum)) }
      : line));
  }

  return (
    <form action={formAction} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
      <input type="hidden" name="items" value={JSON.stringify(lines)}/>

      <div className="space-y-7">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Productos</h2>
          <p className="mt-1 text-sm text-slate-500">Busca por nombre, SKU o marca. Solo aparecen unidades disponibles.</p>
          <div className="relative mt-5">
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
              placeholder="Ej. pastillas, VIC-FRE-001 o Bosch"
              autoComplete="off"
              className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {searchOpen && search.trim() && (
              <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border bg-white py-1 shadow-xl">
                {matches.length ? matches.map((product) => (
                  <button key={product.inventoryItemId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addProduct(product)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-blue-50">
                    <ProductThumbnail product={product} />
                    <span className="min-w-0 flex-1"><b className="block truncate">{product.name}</b><small className="text-slate-500">{product.sku} · {product.location}</small></span>
                    <span className="text-right"><b className="block text-blue-700">{money.format(product.price)}</b><small className="text-slate-500">{product.available} disponibles</small></span>
                  </button>
                )) : <p className="px-4 py-4 text-sm text-slate-500">No hay productos disponibles con esa búsqueda.</p>}
              </div>
            )}
          </div>

          {saleLines.length ? (
            <div className="mt-6 divide-y">
              {saleLines.map(({ product, quantity }) => (
                <article key={product.inventoryItemId} className="grid items-center gap-3 py-4 sm:grid-cols-[64px_minmax(0,1fr)_100px_120px_auto]">
                  <ProductThumbnail product={product} compact />
                  <div className="min-w-0"><b className="block truncate">{product.name}</b><small className="text-slate-500">{product.sku} · Stock: {product.available}</small></div>
                  <input aria-label={`Cantidad de ${product.name}`} type="number" min={1} max={product.available} value={quantity} onChange={(event) => changeQuantity(product.inventoryItemId, Number(event.target.value), product.available)} className="rounded-xl border p-2 text-center"/>
                  <strong className="text-right">{money.format(product.price * quantity)}</strong>
                  <button type="button" onClick={() => setLines((current) => current.filter((line) => line.inventoryItemId !== product.inventoryItemId))} className="text-sm font-bold text-red-700">Quitar</button>
                </article>
              ))}
            </div>
          ) : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Agrega el primer producto a la venta.</div>}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Cliente</h2>
          <p className="mt-1 text-sm text-slate-500">Si dejas correo y teléfono vacíos, se usará Cliente genérico. Con correo o teléfono buscaremos al cliente existente y evitaremos duplicarlo.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input name="customerName" autoComplete="name" placeholder="Nombre del cliente (opcional)" maxLength={120} className="rounded-xl border p-3 sm:col-span-2"/>
            <input name="customerEmail" type="email" autoComplete="email" placeholder="Correo para identificarlo" className="rounded-xl border p-3"/>
            <input name="customerPhone" autoComplete="tel" placeholder="Teléfono para identificarlo" maxLength={30} className="rounded-xl border p-3"/>
            <textarea name="notes" placeholder="Notas de la venta" maxLength={500} rows={3} className="rounded-xl border p-3 sm:col-span-2"/>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 text-slate-900 shadow-lg lg:sticky lg:top-6">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Resumen</p>
        <div className="mt-5 flex justify-between text-slate-600"><span>Unidades</span><span className="font-bold text-slate-900">{lines.reduce((sum, line) => sum + line.quantity, 0)}</span></div>
        <div className="mt-3 flex items-end justify-between border-t border-blue-100 pt-5"><span className="font-bold">Total</span><strong className="text-3xl text-blue-700">{money.format(total)}</strong></div>
        <div className="mt-6 grid gap-2 text-sm font-bold">
          <span>Medio de pago</span>
          <PaymentMethodSelect />
        </div>
        {state.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>}
        <button disabled={pending || lines.length === 0} className="mt-6 w-full rounded-full bg-blue-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Registrando venta…" : "Registrar venta y descontar stock"}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">La operación queda registrada como pagada y entregada.</p>
      </aside>
    </form>
  );
}
