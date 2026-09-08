import { formatUsd, getImportFinanceSummary } from "@/lib/import-finances";

export function ImportFinanceSummary({ importType = "VEHICLE", valueUsd, towingCostUsd, oceanFreightUsd, shippingCostUsd = 0, logisticsServiceUsd = 0, otherChargesUsd = 0, paidAmountUsd }: {
  importType?: "VEHICLE" | "PARTS";
  valueUsd?: number | null;
  towingCostUsd: number;
  oceanFreightUsd: number;
  shippingCostUsd?: number;
  logisticsServiceUsd?: number;
  otherChargesUsd?: number;
  paidAmountUsd: number;
}) {
  const summary = getImportFinanceSummary({ importType, valueUsd, towingCostUsd, oceanFreightUsd, shippingCostUsd, logisticsServiceUsd, otherChargesUsd, paidAmountUsd });
  const status = {
    UNPRICED: { label: "Costos por registrar", className: "bg-slate-100 text-slate-700" },
    PENDING: { label: "Pago pendiente", className: "bg-amber-100 text-amber-800" },
    PARTIAL: { label: "Pago parcial", className: "bg-blue-100 text-blue-800" },
    PAID: { label: "Pagado", className: "bg-emerald-100 text-emerald-800" },
  }[summary.paymentStatus];

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-white shadow-lg shadow-blue-950/5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-5 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Resumen financiero</p>
          <h2 className="mt-1 text-2xl font-black">Costos de importación</h2>
        </div>
        <span className={`rounded-full px-4 py-2 text-xs font-black ${status.className}`}>{status.label}</span>
      </div>
      <div className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
        {importType === "PARTS" ? <>
          <CostRow label="Valor de los repuestos" value={summary.goodsValueUsd} />
          <CostRow label="Costo de envío" value={summary.shippingCostUsd} />
          <CostRow label="Servicio logístico" value={summary.logisticsServiceUsd} />
          <CostRow label="Otros cargos" value={summary.otherChargesUsd} />
          <CostRow label="Total de la importación" value={summary.totalUsd} strong />
        </> : <>
          <CostRow label="Valor del vehículo (no incluido)" value={summary.vehicleValueUsd} />
          <CostRow label="Costo de grúa" value={summary.towingCostUsd} />
          <CostRow label="Flete marítimo" value={summary.oceanFreightUsd} />
          <CostRow label="Otros cargos" value={summary.otherChargesUsd} />
          <CostRow label="Total de servicios en USD" value={summary.totalUsd} strong />
        </>}
      </div>
      <div className="grid gap-3 border-t border-blue-100 bg-blue-50/60 p-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><span className="text-xs font-bold uppercase tracking-wider">Monto cancelado</span><strong className="mt-1 block text-2xl font-black">{formatUsd(summary.paidAmountUsd)}</strong></div>
        <div className={`rounded-2xl border p-4 ${summary.balanceUsd > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span className="text-xs font-bold uppercase tracking-wider">Saldo pendiente</span><strong className="mt-1 block text-2xl font-black">{formatUsd(summary.balanceUsd)}</strong></div>
      </div>
      <p className="border-t border-blue-100 px-6 py-3 text-center text-xs font-semibold text-slate-500">{importType === "PARTS" ? "El total incluye los repuestos, el envío, el servicio logístico y otros cargos." : "El total incluye grúa, flete marítimo y otros cargos. El valor del vehículo se muestra por separado."} Todos los montos están en USD.</p>
    </section>
  );
}

function CostRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 border-b border-slate-100 py-2 ${strong ? "text-blue-800" : "text-slate-700"}`}><span className={strong ? "font-black" : "text-sm"}>{label}</span><span className={strong ? "text-lg font-black" : "font-bold"}>{formatUsd(value)}</span></div>;
}
