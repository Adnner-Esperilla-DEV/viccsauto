export type ImportFinanceValues = {
  importType?: "VEHICLE" | "PARTS" | string;
  valueUsd?: number | null;
  towingCostUsd: number;
  oceanFreightUsd: number;
  shippingCostUsd?: number;
  logisticsServiceUsd?: number;
  otherChargesUsd?: number;
  paidAmountUsd: number;
};

const usdFormatter = new Intl.NumberFormat("es-CL", { style: "currency", currency: "USD" });

export function getImportFinanceSummary(values: ImportFinanceValues) {
  const vehicleValueUsd = Math.max(0, values.valueUsd ?? 0);
  const towingCostUsd = Math.max(0, values.towingCostUsd);
  const oceanFreightUsd = Math.max(0, values.oceanFreightUsd);
  const shippingCostUsd = Math.max(0, values.shippingCostUsd ?? 0);
  const logisticsServiceUsd = Math.max(0, values.logisticsServiceUsd ?? 0);
  const otherChargesUsd = Math.max(0, values.otherChargesUsd ?? 0);
  const paidAmountUsd = Math.max(0, values.paidAmountUsd);
  const totalCents = values.importType === "PARTS"
    ? Math.round(vehicleValueUsd * 100) + Math.round(shippingCostUsd * 100) + Math.round(logisticsServiceUsd * 100) + Math.round(otherChargesUsd * 100)
    : Math.round(towingCostUsd * 100) + Math.round(oceanFreightUsd * 100) + Math.round(otherChargesUsd * 100);
  const totalUsd = totalCents / 100;
  const balanceUsd = Math.max(0, totalCents - Math.round(paidAmountUsd * 100)) / 100;
  const paymentStatus = totalUsd === 0
    ? "UNPRICED"
    : paidAmountUsd === 0
      ? "PENDING"
      : balanceUsd > 0
        ? "PARTIAL"
        : "PAID";

  return { vehicleValueUsd, goodsValueUsd: vehicleValueUsd, towingCostUsd, oceanFreightUsd, shippingCostUsd, logisticsServiceUsd, otherChargesUsd, paidAmountUsd, totalUsd, balanceUsd, paymentStatus } as const;
}

export function formatUsd(value: number) {
  return usdFormatter.format(value);
}
