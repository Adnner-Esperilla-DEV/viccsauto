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

function validAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getImportFinanceSummary(values: ImportFinanceValues) {
  const vehicleValueUsd = validAmount(values.valueUsd);
  const towingCostUsd = validAmount(values.towingCostUsd);
  const oceanFreightUsd = validAmount(values.oceanFreightUsd);
  const shippingCostUsd = validAmount(values.shippingCostUsd);
  const logisticsServiceUsd = validAmount(values.logisticsServiceUsd);
  const otherChargesUsd = validAmount(values.otherChargesUsd);
  const paidAmountUsd = validAmount(values.paidAmountUsd);
  const totalCents =
    values.importType === "PARTS"
      ? Math.round(vehicleValueUsd * 100) +
        Math.round(shippingCostUsd * 100) +
        Math.round(logisticsServiceUsd * 100) +
        Math.round(otherChargesUsd * 100)
      : Math.round(towingCostUsd * 100) + Math.round(oceanFreightUsd * 100) + Math.round(otherChargesUsd * 100);
  const totalUsd = totalCents / 100;
  const balanceUsd = Math.max(0, totalCents - Math.round(paidAmountUsd * 100)) / 100;
  const paymentStatus =
    totalUsd === 0 ? "UNPRICED" : paidAmountUsd === 0 ? "PENDING" : balanceUsd > 0 ? "PARTIAL" : "PAID";

  return {
    vehicleValueUsd,
    goodsValueUsd: vehicleValueUsd,
    towingCostUsd,
    oceanFreightUsd,
    shippingCostUsd,
    logisticsServiceUsd,
    otherChargesUsd,
    paidAmountUsd,
    totalUsd,
    balanceUsd,
    paymentStatus,
  } as const;
}

export function formatUsd(value: number) {
  return usdFormatter.format(value);
}
