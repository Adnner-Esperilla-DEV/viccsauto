import Link from "next/link";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUsd, getImportFinanceSummary } from "@/lib/import-finances";
import { importStatusLabel } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function ImportsAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff();
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = await db.vehicleImport.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) redirect(`/admin/imports?page=${totalPages}`);

  const imports = await db.vehicleImport.findMany({
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      _count: { select: { images: true, attachments: true } },
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const firstItem = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-widest text-blue-700">Logística</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Importaciones de vehículos</h1>
          <p className="mt-2 text-slate-600">Consulta y administra todas las unidades desde una vista compacta.</p>
        </div>
        <Link href="/admin/imports/new" className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800">
          Nueva importación
        </Link>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <Header>Vehículo</Header>
                <Header>Cliente</Header>
                <Header>Celular</Header>
                <Header align="right">Grúa</Header>
                <Header align="right">Flete marítimo</Header>
                <Header align="right">Saldo</Header>
                <Header>Seguimiento</Header>
                <Header>Actualizado</Header>
                <Header align="right"><span className="sr-only">Acciones</span></Header>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {imports.map((item) => {
                const finance = getImportFinanceSummary({
                  towingCostUsd: Number(item.towingCostUsd),
                  oceanFreightUsd: Number(item.oceanFreightUsd),
                  paidAmountUsd: Number(item.paidAmountUsd),
                });

                return (
                  <tr key={item.id} className="group transition hover:bg-blue-50/50">
                    <Cell>
                      <Link href={`/admin/imports/${item.id}`} className="font-black text-slate-950 hover:text-blue-700 hover:underline">
                        {item.year} {item.make} {item.model}
                      </Link>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.lotNumber ? `Lote ${item.lotNumber} · VIN ${item.vin}` : `VIN ${item.vin}`}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {item._count.images} imágenes · {item._count.attachments} adjuntos
                      </span>
                    </Cell>
                    <Cell>
                      <span className="block font-bold text-slate-800">{item.customer.firstName} {item.customer.lastName}</span>
                      <span className="mt-1 block max-w-52 truncate text-xs text-slate-500" title={item.customer.email}>{item.customer.email}</span>
                    </Cell>
                    <Cell>
                      <span className={item.customer.phone ? "font-semibold text-slate-800" : "text-slate-400"}>
                        {item.customer.phone || "No registrado"}
                      </span>
                    </Cell>
                    <Cell align="right"><Money value={Number(item.towingCostUsd)} /></Cell>
                    <Cell align="right"><Money value={Number(item.oceanFreightUsd)} /></Cell>
                    <Cell align="right">
                      <span className={`inline-flex rounded-lg px-2.5 py-1.5 font-black ${finance.balanceUsd > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {formatUsd(finance.balanceUsd)}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="inline-flex whitespace-nowrap rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        {importStatusLabel(item.status)}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-600">{item.updatedAt.toLocaleDateString("es-CL")}</span>
                      <span className="mt-1 block text-xs text-slate-400">{item.updatedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                    </Cell>
                    <Cell align="right">
                      <Link href={`/admin/imports/${item.id}`} className="inline-flex rounded-lg border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-700 hover:text-white">
                        Ver detalle
                      </Link>
                    </Cell>
                  </tr>
                );
              })}
              {!imports.length && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-500">Todavía no hay importaciones registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {total > 0 && (
        <nav aria-label="Paginación de importaciones" className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-white p-4 sm:flex-row">
          <p className="text-sm text-slate-500">Mostrando <strong className="text-slate-800">{firstItem}–{lastItem}</strong> de <strong className="text-slate-800">{total}</strong> importaciones</p>
          <div className="flex items-center gap-2">
            {page > 1 ? <Link href={`/admin/imports?page=${page - 1}`} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">← Anterior</Link> : <span aria-disabled="true" className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-bold text-slate-300">← Anterior</span>}
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Página {page} de {totalPages}</span>
            {page < totalPages ? <Link href={`/admin/imports?page=${page + 1}`} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">Siguiente →</Link> : <span aria-disabled="true" className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-bold text-slate-300">Siguiente →</span>}
          </div>
        </nav>
      )}
    </main>
  );
}

function Header({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th scope="col" className={`whitespace-nowrap px-4 py-3 font-black ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function Cell({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

function Money({ value }: { value: number }) {
  return <span className="whitespace-nowrap font-bold tabular-nums text-slate-800">{formatUsd(value)}</span>;
}
