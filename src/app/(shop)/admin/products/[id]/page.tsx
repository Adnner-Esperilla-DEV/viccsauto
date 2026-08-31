import Link from "next/link";
import { notFound } from "next/navigation";
import { addProductCompatibilityAction, removeProductCompatibilityAction } from "@/app/actions/admin";
import { VehicleCompatibilityFields } from "@/components/automotive/VehicleCompatibilityFields";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function ProductCompatibilityPage({ params, searchParams }: PageProps) {
  await requireStaff();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [product, years, makes] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        compatibility: {
          include: { vehicleModel: { include: { make: true } } },
          orderBy: [{ vehicleModel: { make: { name: "asc" } } }, { vehicleModel: { name: "asc" } }, { yearFrom: "asc" }],
        },
      },
    }),
    db.vehicleYear.findMany({ where: { isActive: true }, orderBy: { year: "desc" } }),
    db.vehicleMake.findMany({
      where: { isActive: true, models: { some: { isActive: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/admin/products" className="text-sm font-bold text-blue-700">← Volver a productos</Link>
      <p className="mt-6 font-bold uppercase tracking-widest text-blue-700">Compatibilidad vehicular</p>
      <h1 className="mt-2 text-4xl font-black">{product.name}</h1>
      <p className="mt-3 text-slate-600">{product.sku} · {product.brand?.name ?? "Repuesto sin marca"} · {product.category.name}</p>

      {query.error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">No se pudo guardar. Revisa el modelo y que el año final sea igual o posterior al inicial.</p>}
      {query.ok && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-800">Compatibilidad actualizada correctamente.</p>}

      <section className="mt-8 rounded-3xl bg-white p-7">
        <h2 className="text-2xl font-black">Agregar compatibilidad</h2>
        <p className="mt-2 text-sm text-slate-600">Escribe la marca y selecciónala de las sugerencias; sus modelos se cargarán automáticamente.</p>
        <form action={addProductCompatibilityAction} className="mt-7 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="productId" value={product.id}/>
            <VehicleCompatibilityFields makes={makes.map(({ id: makeId, name }) => ({ id: makeId, name }))}/>
            <label className="grid gap-1 text-sm font-bold">Desde el año
              <select required name="yearFrom" className="rounded-xl border bg-white p-3 font-normal">{years.map(({ year }) => <option key={year} value={year}>{year}</option>)}</select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Hasta el año
              <select required name="yearTo" className="rounded-xl border bg-white p-3 font-normal">{years.map(({ year }) => <option key={year} value={year}>{year}</option>)}</select>
            </label>
            <input name="engine" placeholder="Motor opcional, ej. 2.0" className="rounded-xl border p-3"/>
            <input name="notes" placeholder="Notas opcionales" className="rounded-xl border p-3"/>
            <button className="rounded-full bg-blue-700 p-3 font-bold text-white md:col-span-2">Agregar compatibilidad</button>
          </form>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-7">
        <h2 className="text-2xl font-black">Compatibilidades registradas</h2>
        <p className="mt-2 text-sm text-slate-600">Para un repuesto compatible con Ford Escape 2013 y Chevrolet Equinox 2013–2015, registra dos filas independientes.</p>
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
                  <input type="hidden" name="id" value={item.id}/>
                  <input type="hidden" name="productId" value={product.id}/>
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
