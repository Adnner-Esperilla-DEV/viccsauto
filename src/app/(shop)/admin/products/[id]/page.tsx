import Link from "next/link";
import { notFound } from "next/navigation";

import { addProductCompatibilityAction, removeProductCompatibilityAction } from "@/app/actions/admin";
import { ProductEditModal } from "@/components/admin/ProductEditModal";
import { VehicleCompatibilityFields } from "@/components/automotive/VehicleCompatibilityFields";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

const productErrors: Record<string, string> = {
  "product-duplicate": "Ya existe otro producto con ese SKU o slug.",
  "product-featured-image": "Un producto destacado necesita al menos una imagen.",
  "product-image": "No se pudieron guardar las imágenes. Revisa el formato y vuelve a intentarlo.",
  "product-invalid": "Revisa los datos del producto antes de guardar.",
};

function oemText(value: string) {
  try {
    const items: unknown = JSON.parse(value);
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === "string").join(", ") : "";
  } catch {
    return "";
  }
}

export default async function ProductManagementPage({ params, searchParams }: PageProps) {
  await requireStaff();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [product, years, makes, categories, brands] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { position: "asc" }, take: 5, select: { id: true } },
        compatibility: {
          include: { vehicleModel: { include: { make: true } } },
          orderBy: [{ vehicleModel: { make: { name: "asc" } } }, { vehicleModel: { name: "asc" } }, { yearFrom: "asc" }],
        },
      },
    }),
    db.vehicleYear.findMany({ where: { isActive: true }, orderBy: { year: "desc" } }),
    db.vehicleMake.findMany({ where: { isActive: true, models: { some: { isActive: true } } }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();
  const productError = query.error ? productErrors[query.error] : undefined;
  const compatibilityError = query.error === "compatibility";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/admin/products" className="text-sm font-bold text-blue-700">← Volver a productos</Link>
      <p className="mt-6 font-bold uppercase tracking-widest text-blue-700">Gestión de producto</p>
      <h1 className="mt-2 text-4xl font-black">{product.name}</h1>
      <p className="mt-3 text-slate-600">{product.sku} · {product.brand?.name ?? "Repuesto sin marca"} · {product.category.name}</p>

      {productError && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{productError}</p>}
      {compatibilityError && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">No se pudo guardar la compatibilidad. Revisa el modelo y el rango de años.</p>}
      {query.ok === "updated" && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">Producto actualizado correctamente.</p>}
      {query.ok && query.ok !== "updated" && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">Compatibilidad actualizada correctamente.</p>}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Editar producto</h2>
            <p className="mt-2 text-sm font-normal text-slate-600">Actualiza la información comercial, visibilidad e imágenes. El stock se modifica desde Inventario.</p>
          </div>
          <Link href="/admin/inventory" className="text-sm font-bold text-blue-700 hover:underline">Ir a inventario</Link>
        </div>
        <div className="mt-5">
        <ProductEditModal
          categories={categories}
          brands={brands}
          initialOpen={Boolean(productError)}
          serverError={productError}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            shortDescription: product.shortDescription,
            description: product.description,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            priceUsd: product.priceUsd === null ? null : Number(product.priceUsd),
            usdToClpRate: product.usdToClpRate === null ? null : Number(product.usdToClpRate),
            lowStockAt: product.lowStockAt,
            condition: product.condition,
            categoryId: product.categoryId,
            brandId: product.brandId,
            oemCodes: oemText(product.oemCodes),
            featured: product.featured,
            isActive: product.isActive,
            images: product.images.map((image) => ({ id: image.id, url: `/api/product-images/${image.id}` })),
          }}
        />
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7">
        <h2 className="text-2xl font-black">Agregar compatibilidad</h2>
        <p className="mt-2 text-sm font-normal text-slate-600">Selecciona la marca, el modelo y el rango de años compatible.</p>
        <form action={addProductCompatibilityAction} className="mt-7 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <VehicleCompatibilityFields makes={makes.map(({ id: makeId, name }) => ({ id: makeId, name }))} />
          <label className="grid gap-1 text-sm font-bold">Desde el año
            <select required name="yearFrom" className="rounded-xl border bg-white p-3 font-normal">{years.map(({ year }) => <option key={year} value={year}>{year}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm font-bold">Hasta el año
            <select required name="yearTo" className="rounded-xl border bg-white p-3 font-normal">{years.map(({ year }) => <option key={year} value={year}>{year}</option>)}</select>
          </label>
          <input name="engine" placeholder="Motor opcional, ej. 2.0" className="rounded-xl border p-3" />
          <input name="notes" placeholder="Notas opcionales" className="rounded-xl border p-3" />
          <button className="rounded-full bg-blue-700 p-3 font-bold text-white md:col-span-2">Agregar compatibilidad</button>
        </form>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7">
        <h2 className="text-2xl font-black">Compatibilidades registradas</h2>
        <p className="mt-2 text-sm font-normal text-slate-600">Registra una fila independiente para cada modelo y rango de años.</p>
        {product.compatibility.length ? (
          <div className="mt-5 divide-y">
            {product.compatibility.map((item) => (
              <article key={item.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="mr-auto">
                  <b>{item.vehicleModel.make.name} {item.vehicleModel.name}</b>
                  <span className="block text-sm text-slate-600">{item.yearFrom ?? "Sin año inicial"}–{item.yearTo ?? "Sin año final"}{item.engine ? ` · Motor ${item.engine}` : ""}</span>
                  {item.notes && <small className="text-slate-500">{item.notes}</small>}
                </div>
                <form action={removeProductCompatibilityAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="font-bold text-red-700">Eliminar</button>
                </form>
              </article>
            ))}
          </div>
        ) : <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-amber-800">Este producto aún no tiene vehículos compatibles.</p>}
      </section>
    </main>
  );
}
