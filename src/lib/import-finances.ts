export type ImportFinanceValues = {
  valueUsd?: number | null;
  towingCostUsd: number;
  oceanFreightUsd: number;
  paidAmountUsd: number;
};

const usdFormatter = new Intl.NumberFormat("es-CL", { style: "currency", currency: "USD" });

export function getImportFinanceSummary(values: ImportFinanceValues) {
  const vehicleValueUsd = Math.max(0, values.valueUsd ?? 0);
  const towingCostUsd = Math.max(0, values.towingCostUsd);
  const oceanFreightUsd = Math.max(0, values.oceanFreightUsd);
  const paidAmountUsd = Math.max(0, values.paidAmountUsd);
  const totalUsd = towingCostUsd + oceanFreightUsd;
  const balanceUsd = Math.max(0, totalUsd - paidAmountUsd);
  const paymentStatus = totalUsd === 0
    ? "UNPRICED"
    : paidAmountUsd === 0
      ? "PENDING"
      : balanceUsd > 0
        ? "PARTIAL"
        : "PAID";

  return { vehicleValueUsd, towingCostUsd, oceanFreightUsd, paidAmountUsd, totalUsd, balanceUsd, paymentStatus } as const;
}

export function formatUsd(value: number) {
  return usdFormatter.format(value);
}
