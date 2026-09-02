import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartCard } from "@/components";
import { getCategoryBySlug, listProducts } from "@/lib/catalog-repository";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const category = await getCategoryBySlug((await params).id); return category ? { title: `${category.name}: repuestos y autopartes`, description: category.description } : {}; }
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [category, items] = await Promise.all([getCategoryBySlug(id), listProducts({ category: id })]); if (!category) notFound(); return <main className="mx-auto max-w-7xl px-6 py-14"><p className="font-bold uppercase tracking-widest text-blue-700">Categoría</p><h1 className="mt-2 text-5xl font-black">{category.name}</h1><p className="mt-4 max-w-2xl text-slate-600">{category.description} Confirma marca, modelo, año y motor antes de comprar.</p>{items.length ? <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{items.map((product) => <PartCard key={product.id} product={product}/>)}</div> : <p className="mt-10 rounded-3xl bg-white p-10 text-slate-600">Todavía no hay productos activos en esta categoría.</p>}</main>; }
