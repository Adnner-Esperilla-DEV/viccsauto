"use client";

import { useMemo, useState } from "react";
import { formatUsd, getImportFinanceSummary } from "@/lib/import-finances";

type ImportFinanceFieldsProps = {
  initialValueUsd?: string;
  initialTowingCostUsd?: string;
  initialOceanFreightUsd?: string;
  initialOtherChargesUsd?: string;
  initialPaidAmountUsd?: string;
};

function amount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function ImportFinanceFields({
  initialValueUsd = "",
  initialTowingCostUsd = "",
  initialOceanFreightUsd = "",
  initialOtherChargesUsd = "",
  initialPaidAmountUsd = "",
}: ImportFinanceFieldsProps) {
  const [valueUsd, setValueUsd] = useState(initialValueUsd);
  const [towingCostUsd, setTowingCostUsd] = useState(initialTowingCostUsd);
  const [oceanFreightUsd, setOceanFreightUsd] = useState(initialOceanFreightUsd);
  const [otherChargesUsd, setOtherChargesUsd] = useState(initialOtherChargesUsd);
  const [paidAmountUsd, setPaidAmountUsd] = useState(initialPaidAmountUsd);
  const summary = useMemo(
    () =>
      getImportFinanceSummary({
        valueUsd: amount(valueUsd),
        towingCostUsd: amount(towingCostUsd),
        oceanFreightUsd: amount(oceanFreightUsd),
        otherChargesUsd: amount(otherChargesUsd),
        paidAmountUsd: amount(paidAmountUsd),
      }),
    [valueUsd, towingCostUsd, oceanFreightUsd, otherChargesUsd, paidAmountUsd],
  );
  const field =
    "mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
  const label = "text-sm font-bold text-slate-700";
  const financeLabel = `${label} flex h-full flex-col justify-end`;

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 shadow-sm">
      <div className="border-b border-blue-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Costos y pagos</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Resumen financiero de la importación</h2>
          </div>
          <span className="rounded-full bg-blue-700 px-4 py-2 text-xs font-black tracking-wide text-white">
            TODO EN USD
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Todos los importes se registran en dólares estadounidenses. El valor del vehículo es informativo y no se suma
          al total a cancelar.
        </p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <label className={financeLabel}>
          Valor del vehículo (USD)
          <input
            type="number"
            min="0"
            step="0.01"
            name="valueUsd"
            value={valueUsd}
            onChange={(event) => setValueUsd(event.target.value)}
            placeholder="0.00"
            className={field}
          />
        </label>
        <label className={financeLabel}>
          Costo de grúa (USD)
          <input
            type="number"
            min="0"
            step="0.01"
            name="towingCostUsd"
            value={towingCostUsd}
            onChange={(event) => setTowingCostUsd(event.target.value)}
            placeholder="0.00"
            className={field}
          />
        </label>
        <label className={financeLabel}>
          Flete marítimo (USD)
          <input
            type="number"
            min="0"
            step="0.01"
            name="oceanFreightUsd"
            value={oceanFreightUsd}
            onChange={(event) => setOceanFreightUsd(event.target.value)}
            placeholder="0.00"
            className={field}
          />
        </label>
        <label className={financeLabel}>
          <span>
            Otros cargos (USD) <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            name="otherChargesUsd"
            value={otherChargesUsd}
            onChange={(event) => setOtherChargesUsd(event.target.value)}
            placeholder="0.00"
            className={field}
          />
        </label>
        <label className={financeLabel}>
          Monto cancelado (USD)
          <input
            type="number"
            min="0"
            max={summary.totalUsd}
            step="0.01"
            name="paidAmountUsd"
            value={paidAmountUsd}
            onChange={(event) => setPaidAmountUsd(event.target.value)}
            placeholder="0.00"
            className={field}
          />
        </label>
      </div>

      <div className="grid gap-3 border-t border-blue-100 bg-white/70 px-6 py-5 sm:grid-cols-3">
        <FinanceCard label="Total de servicios" value={summary.totalUsd} tone="blue" />
        <FinanceCard label="Cancelado" value={summary.paidAmountUsd} tone="green" />
        <FinanceCard
          label="Saldo pendiente"
          value={summary.balanceUsd}
          tone={summary.balanceUsd > 0 ? "amber" : "green"}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-6 py-4">
        <p className="text-sm font-semibold text-slate-600">
          Puedes registrar un abono parcial o marcar el pago completo.
        </p>
        <button
          type="button"
          disabled={summary.totalUsd <= 0}
          onClick={() => setPaidAmountUsd(summary.totalUsd.toFixed(2))}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Marcar pago total
        </button>
      </div>
    </section>
  );
}

function FinanceCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "amber" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <span className="block text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
      <strong className="mt-1 block text-xl font-black" aria-live="polite">
        {formatUsd(value)}
      </strong>
    </div>
  );
}
