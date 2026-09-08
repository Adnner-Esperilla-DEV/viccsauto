import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportStatusTimeline } from "@/components";
import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUsd, getImportFinanceSummary } from "@/lib/import-finances";

export const dynamic = "force-dynamic";
/* eslint-disable @next/next/no-img-element */

export default async function CustomerImportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (isStaff(user)) redirect("/admin/imports");
  const imports = await db.vehicleImport.findMany({
    where: { customerId: user.id },
    include: {
      images: { take: 1, orderBy: { position: "asc" }, select: { id: true } },
      parts: { take: 1, orderBy: { position: "asc" }, select: { description: true } },
      _count: { select: { parts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return <main className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold uppercase tracking-widest text-blue-700">Mi cuenta</p><h1 className="mt-2 text-4xl font-black">Mis importaciones</h1><p className="mt-2 text-slate-600">Sigue el avance de tus vehículos, repuestos y autopartes.</p></div><Link href="/account" className="font-bold text-blue-700">Volver a mi cuenta</Link></div>
    <div className="mt-8 grid gap-5">{imports.map((item) => {
      const title = item.importType === "PARTS" ? item.parts[0]?.description ?? "Repuestos y autopartes" : `${item.year} ${item.make} ${item.model}`;
      const subtitle = item.importType === "PARTS" ? `${item._count.parts} ${item._count.parts === 1 ? "pieza" : "piezas"}` : `VIN ${item.vin}`;
      return <Link key={item.id} href={`/imports/${item.id}`} className="grid overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:border-blue-300 md:grid-cols-[220px_1fr]">
        {item.images[0] ? <img src={`/api/import-images/${item.images[0].id}`} alt="" className="h-full min-h-44 w-full object-cover"/> : <div className="grid min-h-44 place-items-center bg-slate-100 text-slate-400">Sin imagen</div>}
        <div className="p-6"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{item.importType === "PARTS" ? "Repuestos" : "Vehículo"} · {item.referenceCode}</p><h2 className="mt-1 text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}{item.lotNumber ? ` · Lote ${item.lotNumber}` : ""}</p><ImportPaymentBadge item={item}/><div className="mt-5"><ImportStatusTimeline status={item.status}/></div></div>
      </Link>;
    })}
    {!imports.length && <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><h2 className="text-xl font-black">Aún no tienes importaciones asignadas</h2><p className="mt-2 text-slate-500">Cuando registremos una importación a tu nombre, aparecerá aquí.</p></div>}</div>
  </main>;
}

function ImportPaymentBadge({ item }: { item: { importType: string; valueUsd: unknown; towingCostUsd: unknown; oceanFreightUsd: unknown; shippingCostUsd: unknown; logisticsServiceUsd: unknown; otherChargesUsd: unknown; paidAmountUsd: unknown } }) {
  const summary = getImportFinanceSummary({ importType: item.importType, valueUsd: Number(item.valueUsd ?? 0), towingCostUsd: Number(item.towingCostUsd), oceanFreightUsd: Number(item.oceanFreightUsd), shippingCostUsd: Number(item.shippingCostUsd), logisticsServiceUsd: Number(item.logisticsServiceUsd), otherChargesUsd: Number(item.otherChargesUsd), paidAmountUsd: Number(item.paidAmountUsd) });
  const paid = summary.paymentStatus === "PAID";
  return <div className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${paid ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="text-xs font-black uppercase tracking-wider">{paid ? "Pagado" : summary.paymentStatus === "PARTIAL" ? "Pago parcial" : summary.paymentStatus === "UNPRICED" ? "Costos por registrar" : "Pago pendiente"}</span><strong className="text-sm">Saldo: {formatUsd(summary.balanceUsd)}</strong></div>;
}
