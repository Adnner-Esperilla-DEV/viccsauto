import Link from "next/link";
import { createProductAction, toggleProductAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  await requireStaff();
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({
      include: { category: true, brand: true, _count: { select: { compatibility: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-4xl font-black">Productos</h1>
      <p className="mt-3 text-slate-600">La marca del repuesto es opcional. Cada producto puede asociarse a varios modelos y rangos de años.</p>

      <section className="mt-8 overflow-x-auto rounded-3xl bg-white p-6">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead><tr><th className="p-3">SKU</th><th>Producto</th><th>Precio</th><th>Stock</th><th>Compatibilidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>{products.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-3">{row.sku}</td>
              <td><b>{row.name}</b><small className="block text-slate-500">{row.brand?.name ?? "Sin marca"} · {row.category.name}</small></td>
              <td>{formatPrice(row.price)}</td>
              <td>{row.stock}</td>
              <td><Link href={`/admin/products/${row.id}`} className="font-bold text-blue-700">Gestionar ({row._count.compatibility})</Link></td>
              <td>{row.isActive ? "Activo" : "Inactivo"}</td>
              <td><form action={toggleProductAction}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="active" value={String(!row.isActive)}/><button className="font-bold text-blue-700">{row.isActive ? "Desactivar" : "Activar"}</button></form></td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <section className="mt-8 rounded-3xl bg-white p-7">
        <h2 className="text-2xl font-black">Nuevo producto</h2>
        <p className="mt-2 text-sm text-slate-600">Después de crearlo, usa “Gestionar” para indicar los vehículos y años compatibles.</p>
        <form action={createProductAction} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input required name="name" placeholder="Nombre" className="rounded-xl border p-3"/>
          <input required name="slug" placeholder="slug" className="rounded-xl border p-3"/>
          <input required name="sku" placeholder="SKU" className="rounded-xl border p-3"/>
          <input required type="number" name="price" min="1" placeholder="Precio CLP" className="rounded-xl border p-3"/>
          <input required type="number" name="stock" min="0" placeholder="Stock inicial" className="rounded-xl border p-3"/>
          <input name="oemCodes" placeholder="OEM separados por coma" className="rounded-xl border p-3"/>
          <select required name="categoryId" className="rounded-xl border bg-white p-3">{categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          <select name="brandId" defaultValue="" className="rounded-xl border bg-white p-3"><option value="">Sin marca / genérico</option>{brands.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          <input required name="shortDescription" placeholder="Descripción corta" className="rounded-xl border p-3 sm:col-span-2"/>
          <textarea required name="description" placeholder="Descripción completa" rows={4} className="rounded-xl border p-3 sm:col-span-2"/>
          <button className="rounded-full bg-blue-700 p-3 font-bold text-white sm:col-span-2">Crear producto</button>
        </form>
      </section>
    </main>
  );
}
