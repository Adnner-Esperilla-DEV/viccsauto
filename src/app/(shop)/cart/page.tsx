import Link from "next/link";

import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { getCartSummary } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const [summary, query] = await Promise.all([getCartSummary(), searchParams]);
  if (!summary.items.length) return <main className="mx-auto max-w-4xl px-6 py-20 text-center"><p className="font-bold uppercase tracking-widest text-blue-700">Tu compra</p><h1 className="mt-2 text-5xl font-black">El carrito está vacío</h1><p className="mt-4 text-slate-600">Explora el catálogo y agrega repuestos compatibles con tu vehículo.</p><Link href="/products" className="mt-8 inline-flex rounded-full bg-blue-700 px-7 py-3 font-bold text-white">Ver repuestos</Link></main>;

  return <main className="mx-auto max-w-6xl px-6 py-14">
    <p className="font-bold uppercase tracking-widest text-blue-700">Tu compra</p><h1 className="mt-2 text-5xl font-black">Carrito</h1>
    {query.added && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-800">Producto agregado correctamente.</p>}
    {query.error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">No pudimos actualizar el carrito. Revisa el stock disponible.</p>}
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">{summary.items.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-3xl border bg-white p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><Link href={`/product/${item.product.slug}`} className="text-lg font-black hover:text-blue-700">{item.product.name}</Link><p className="mt-1 text-sm text-slate-500">{item.product.brand?.name ?? "Sin marca"} · {item.product.sku}</p><strong className="mt-2 block">{formatPrice(item.unitPrice)}</strong></div>
        <form action={updateCartItemAction} className="flex items-center gap-2"><input type="hidden" name="itemId" value={item.id}/><input aria-label={`Cantidad de ${item.product.name}`} className="w-20 rounded-xl border p-2" type="number" name="quantity" min={0} max={Math.min(25, item.product.stock)} defaultValue={item.quantity}/><button className="rounded-full border px-4 py-2 text-sm font-bold">Actualizar</button></form>
        <form action={removeCartItemAction}><input type="hidden" name="itemId" value={item.id}/><button className="text-sm font-bold text-red-700">Eliminar</button></form>
      </article>)}</section>
      <aside className="h-fit rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-7 text-slate-900 shadow-lg lg:sticky lg:top-6">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Tu compra</p>
        <h2 className="mt-1 text-2xl font-black">Resumen</h2>
        <dl className="mt-6 space-y-3 text-sm text-slate-600"><div className="flex justify-between"><dt>Subtotal</dt><dd className="font-bold text-slate-900">{formatPrice(summary.subtotal)}</dd></div><div className="flex justify-between"><dt>Entrega</dt><dd className="font-bold text-slate-900">Se define en checkout</dd></div><div className="flex items-end justify-between border-t border-blue-100 pt-5"><dt className="font-bold text-slate-900">Total antes del destino</dt><dd className="text-3xl font-black text-blue-700">{formatPrice(summary.subtotal)}</dd></div></dl>
        <p className="mt-4 rounded-2xl bg-white/80 p-3 text-xs leading-relaxed text-slate-500">El destino define los tributos de internación. Fuera de Arica, el transporte se paga al recibir.</p>
        <Link href="/checkout" className="mt-6 block rounded-full bg-blue-600 px-6 py-3 text-center font-black text-white transition hover:bg-blue-700">Continuar al checkout</Link>
      </aside>
    </div>
  </main>;
}
