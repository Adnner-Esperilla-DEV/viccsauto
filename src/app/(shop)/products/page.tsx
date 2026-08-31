<<<<<<< HEAD
import type { Metadata } from "next";
import { PartCard } from "@/components";
import { listProducts } from "@/lib/catalog-repository";

export const metadata: Metadata = { title: "Autopartes y repuestos", description: "Catálogo de repuestos y autopartes con compatibilidad para tu vehículo." };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "" } = await searchParams;
  const filtered = await listProducts({ query: q, category });
  return <main className="mx-auto max-w-7xl px-6 py-14"><div className="max-w-3xl"><p className="font-bold uppercase tracking-widest text-blue-700">Catálogo</p><h1 className="mt-2 text-5xl font-black">Autopartes y repuestos</h1><p className="mt-4 text-slate-600">Busca por repuesto, marca y modelo del vehículo, SKU o código OEM. Confirma la compatibilidad antes de comprar.</p></div><form className="my-10 flex max-w-2xl gap-3"><input name="q" defaultValue={q} placeholder="Ej. Ford Escape, pastillas Yaris o 04465-0D150" className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-5 py-3 outline-none focus:border-blue-600"/><button className="rounded-full bg-blue-700 px-6 py-3 font-bold text-white">Buscar</button></form>{filtered.length ? <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <PartCard key={product.id} product={product}/>)}</div> : <div className="rounded-3xl bg-white p-12 text-center"><h2 className="text-2xl font-bold">No encontramos coincidencias</h2><p className="mt-2 text-slate-600">Prueba con la marca, modelo, SKU o código OEM.</p></div>}</main>;
=======
export default function ProductsPage() {
  return (
    <div>
      <h1>ProductsPage</h1>
    </div>
  );
>>>>>>> 833a45fadf50e643868084efb4a23165db1b06fb
}
