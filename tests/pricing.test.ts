import assert from "node:assert/strict";
import test from "node:test";

import { calculateTotals, DEFAULT_CUSTOMS_TAX_RATE_BPS } from "../src/lib/pricing";
import { canTransitionOrder } from "../src/lib/order-states";
import { getImportFinanceSummary } from "../src/lib/import-finances";

const items = [{ unitPrice: 100_000, quantity: 1 }];

test("venta presencial en Arica no cobra envío ni tributos", () => {
  assert.deepEqual(calculateTotals(items, "PICKUP_ARICA"), { subtotal: 100_000, shippingTotal: 0, discountTotal: 0, taxTotal: 0, total: 100_000 });
});

test("despacho en Arica es gratuito y sin tributos adicionales", () => {
  assert.equal(calculateTotals(items, "ARICA").total, 100_000);
});

test("Iquique no suma transporte ni tributos al total cobrado", () => {
  assert.deepEqual(calculateTotals(items, "IQUIQUE"), { subtotal: 100_000, shippingTotal: 0, discountTotal: 0, taxTotal: 0, total: 100_000 });
});

test("resto de Chile aplica la tasa configurable de internación", () => {
  const totals = calculateTotals(items, "REST_OF_CHILE", DEFAULT_CUSTOMS_TAX_RATE_BPS);
  assert.equal(totals.taxTotal, 26_140);
  assert.equal(totals.total, 126_140);
  assert.equal(totals.shippingTotal, 0);
});

test("redondea tributos a pesos completos", () => {
  assert.equal(calculateTotals([{ unitPrice: 999, quantity: 1 }], "REST_OF_CHILE", 2_614).taxTotal, 261);
});

test("impide saltos inválidos de estado", () => {
  assert.equal(canTransitionOrder("PENDING", "COMPLETED"), false);
  assert.equal(canTransitionOrder("PENDING", "CONFIRMED"), true);
  assert.equal(canTransitionOrder("COMPLETED", "COMPLETED"), true);
});

test("una importación de repuestos suma piezas, envío y servicio logístico", () => {
  const summary = getImportFinanceSummary({ importType: "PARTS", valueUsd: 215, towingCostUsd: 0, oceanFreightUsd: 0, shippingCostUsd: 120, logisticsServiceUsd: 75, paidAmountUsd: 200 });
  assert.equal(summary.totalUsd, 410);
  assert.equal(summary.balanceUsd, 210);
  assert.equal(summary.paymentStatus, "PARTIAL");
});

test("una importación de vehículo conserva el valor del vehículo fuera del total", () => {
  const summary = getImportFinanceSummary({ importType: "VEHICLE", valueUsd: 10_000, towingCostUsd: 300, oceanFreightUsd: 900, shippingCostUsd: 500, logisticsServiceUsd: 200, paidAmountUsd: 0 });
  assert.equal(summary.totalUsd, 1_200);
  assert.equal(summary.balanceUsd, 1_200);
});
