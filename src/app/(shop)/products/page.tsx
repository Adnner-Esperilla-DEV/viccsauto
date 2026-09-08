import type { Metadata } from "next";

import { PartCard, ProductVehicleSearch } from "@/components";
import { listProducts, listProductVehicleFilterOptions } from "@/lib/catalog-repository";

export const metadata: Metadata = {
  title: "Autopartes y repuestos",
  description: "Catálogo de repuestos y autopartes con compatibilidad para tu vehículo.",
};
export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams: Promise<{ q?: string; category?: string; make?: string; model?: string }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q = "", category = "", make = "", model = "" } = await searchParams;
  const [filterOptions, filtered] = await Promise.all([
    listProductVehicleFilterOptions(),
    listProducts({ query: q, category, makeId: make, modelId: model, inStockOnly: true }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <div className="max-w-3xl">
        <p className="font-bold uppercase tracking-widest text-blue-700">Catálogo</p>
        <h1 className="mt-2 text-5xl font-black">Autopartes y repuestos</h1>
        <p className="mt-4 text-slate-600">
          Selecciona la marca y el modelo de tu vehículo. Las opciones se generan desde los repuestos que realmente
          están disponibles.
        </p>
      </div>

      <ProductVehicleSearch
        key={`${make}:${model}:${q}:${category}`}
        category={category || undefined}
        initialMakeId={make}
        initialModelId={model}
        initialQuery={q}
        options={filterOptions}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {filtered.length} {filtered.length === 1 ? "repuesto disponible" : "repuestos disponibles"}
        </p>
      </div>

      {filtered.length ? (
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <PartCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-12 text-center">
          <h2 className="text-2xl font-bold">No encontramos repuestos disponibles</h2>
          <p className="mt-2 text-slate-600">Cambia la marca, el modelo o el texto de búsqueda.</p>
        </div>
      )}
    </main>
  );
}
