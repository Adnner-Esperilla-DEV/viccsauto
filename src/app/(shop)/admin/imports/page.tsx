import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportStatusTimeline } from "@/components";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { importStatusLabel } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

export default async function ImportsAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff();
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = await db.vehicleImport.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) redirect(`/admin/imports?page=${totalPages}`);
  const imports = await db.vehicleImport.findMany({ include: { customer: { select: { firstName: true, lastName: true, email: true } }, _count: { select: { images: true, attachments: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  const firstItem = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);
  return <main className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold uppercase tracking-widest text-blue-700">Logística</p><h1 className="mt-2 text-4xl font-black">Importaciones de vehículos</h1><p className="mt-2 text-slate-600">Registra cada unidad y permite que el cliente siga su avance.</p></div><Link href="/admin/imports/new" className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">Nueva importación</Link></div>
    <div className="mt-8 grid gap-5">{imports.map((item) => <Link key={item.id} href={`/admin/imports/${item.id}`} className="rounded-3xl border bg-white p-6 shadow-sm transition hover:border-blue-300">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-wider text-blue-700">{item.lotNumber ? `Lote ${item.lotNumber}` : "Sin número de lote"}</span><h2 className="mt-1 text-2xl font-black">{item.year} {item.make} {item.model}</h2><p className="mt-1 text-sm text-slate-500">VIN {item.vin} · {item.customer.firstName} {item.customer.lastName}</p></div><span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">{importStatusLabel(item.status)}</span></div>
      <div className="mt-5"><ImportStatusTimeline status={item.status} /></div><p className="mt-4 text-xs text-slate-500">{item._count.images} imágenes · {item._count.attachments} adjuntos · Actualizado {item.updatedAt.toLocaleString("es-CL")}</p>
    </Link>)}{!imports.length && <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500">Todavía no hay importaciones registradas.</div>}</div>
    {total > 0 && <nav aria-label="Paginación de importaciones" className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-white p-4 sm:flex-row"><p className="text-sm text-slate-500">Mostrando <strong className="text-slate-800">{firstItem}–{lastItem}</strong> de <strong className="text-slate-800">{total}</strong> importaciones</p><div className="flex items-center gap-2">{page > 1 ? <Link href={`/admin/imports?page=${page - 1}`} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">← Anterior</Link> : <span aria-disabled="true" className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-bold text-slate-300">← Anterior</span>}<span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Página {page} de {totalPages}</span>{page < totalPages ? <Link href={`/admin/imports?page=${page + 1}`} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">Siguiente →</Link> : <span aria-disabled="true" className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-bold text-slate-300">Siguiente →</span>}</div></nav>}
  </main>;
}
