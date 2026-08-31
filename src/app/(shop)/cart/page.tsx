<<<<<<< HEAD
import Link from "next/link";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { getCartSummary } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const [summary, query] = await Promise.all([getCartSummary(), searchParams]);
  if (!summary.items.length) return <main className="mx-auto max-w-4xl px-6 py-20 text-center"><p className="font-bold uppercase tracking-widest text-blue-700">Tu compra</p><h1 className="mt-2 text-5xl font-black">El carrito está vacío</h1><p className="mt-4 text-slate-600">Explora el catálogo y agrega repuestos compatibles con tu vehículo.</p><Link href="/products" className="mt-8 inline-flex rounded-full bg-blue-700 px-7 py-3 font-bold text-white">Ver repuestos</Link></main>;
  return <main className="mx-auto max-w-6xl px-6 py-14"><p className="font-bold uppercase tracking-widest text-blue-700">Tu compra</p><h1 className="mt-2 text-5xl font-black">Carrito</h1>{query.added && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-800">Producto agregado correctamente.</p>}{query.error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">No pudimos actualizar el carrito. Revisa el stock disponible.</p>}<div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]"><section className="space-y-4">{summary.items.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-3xl border bg-white p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><Link href={`/product/${item.product.slug}`} className="text-lg font-black hover:text-blue-700">{item.product.name}</Link><p className="mt-1 text-sm text-slate-500">{item.product.brand?.name ?? "Sin marca"} · {item.product.sku}</p><strong className="mt-2 block">{formatPrice(item.unitPrice)}</strong></div><form action={updateCartItemAction} className="flex items-center gap-2"><input type="hidden" name="itemId" value={item.id}/><input aria-label={`Cantidad de ${item.product.name}`} className="w-20 rounded-xl border p-2" type="number" name="quantity" min={0} max={Math.min(25, item.product.stock)} defaultValue={item.quantity}/><button className="rounded-full border px-4 py-2 text-sm font-bold">Actualizar</button></form><form action={removeCartItemAction}><input type="hidden" name="itemId" value={item.id}/><button className="text-sm font-bold text-red-700">Eliminar</button></form></article>)}</section><aside className="h-fit rounded-3xl bg-slate-950 p-7 text-white"><h2 className="text-2xl font-black">Resumen</h2><dl className="mt-6 space-y-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(summary.subtotal)}</dd></div><div className="flex justify-between"><dt>Envío estimado</dt><dd>{summary.shippingTotal ? formatPrice(summary.shippingTotal) : "Gratis"}</dd></div><div className="flex justify-between border-t border-white/20 pt-4 text-lg font-black"><dt>Total estimado</dt><dd>{formatPrice(summary.total)}</dd></div></dl><p className="mt-4 text-xs text-slate-400">Impuestos incluidos. El envío se confirma en checkout.</p><Link href="/checkout" className="mt-6 block rounded-full bg-blue-600 px-6 py-3 text-center font-bold">Continuar al checkout</Link></aside></div></main>;
=======
export default function CartPage() {
  return (
    <div>
      <h1>CartPage</h1>
    </div>
  );
>>>>>>> 833a45fadf50e643868084efb4a23165db1b06fb
}
