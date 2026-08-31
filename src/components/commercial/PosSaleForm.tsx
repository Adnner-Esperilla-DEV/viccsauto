"use client";

import { useActionState, useMemo, useState } from "react";
import { createPosSaleAction, type PosSaleState } from "@/app/actions/pos";

export type PosProduct = {
  inventoryItemId: string;
  productId: string;
  sku: string;
  name: string;
  brand?: string;
  price: number;
  available: number;
  location: string;
};

type SaleLine = { inventoryItemId: string; quantity: number };

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
                <article key={product.inventoryItemId} className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_100px_120px_auto]">
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
          <p className="mt-1 text-sm text-slate-500">Los datos son opcionales para una venta rápida de mostrador.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input name="customerName" placeholder="Nombre del cliente" maxLength={120} className="rounded-xl border p-3 sm:col-span-2"/>
            <input name="customerEmail" type="email" placeholder="Correo" className="rounded-xl border p-3"/>
            <input name="customerPhone" placeholder="Teléfono" maxLength={30} className="rounded-xl border p-3"/>
            <textarea name="notes" placeholder="Notas de la venta" maxLength={500} rows={3} className="rounded-xl border p-3 sm:col-span-2"/>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl bg-slate-950 p-6 text-white shadow-lg lg:sticky lg:top-6">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-300">Resumen</p>
        <div className="mt-5 flex justify-between text-slate-300"><span>Unidades</span><span>{lines.reduce((sum, line) => sum + line.quantity, 0)}</span></div>
        <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-5"><span className="font-bold">Total</span><strong className="text-3xl text-blue-300">{money.format(total)}</strong></div>
        <label className="mt-6 grid gap-2 text-sm font-bold">Medio de pago
          <select name="paymentMethod" defaultValue="CASH" className="rounded-xl border border-white/20 bg-slate-900 p-3 text-white">
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="OTHER">Otro</option>
          </select>
        </label>
        {state.error && <p role="alert" className="mt-5 rounded-xl bg-red-500/20 p-3 text-sm text-red-100">{state.error}</p>}
        <button disabled={pending || lines.length === 0} className="mt-6 w-full rounded-full bg-blue-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Registrando venta…" : "Registrar venta y descontar stock"}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">La operación queda registrada como pagada y entregada.</p>
      </aside>
    </form>
  );
}
