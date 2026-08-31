import assert from "node:assert/strict";
import test from "node:test";
import { calculateTotals, FREE_SHIPPING_FROM, STANDARD_SHIPPING } from "../src/lib/pricing";
import { canTransitionOrder } from "../src/lib/order-states";

test("calcula subtotal y envío estándar", () => { assert.deepEqual(calculateTotals([{ unitPrice: 10_000, quantity: 2 }], "shipping"), { subtotal: 20_000, shippingTotal: STANDARD_SHIPPING, discountTotal: 0, taxTotal: 0, total: 25_990 }); });
test("envío gratis desde el umbral", () => { assert.equal(calculateTotals([{ unitPrice: FREE_SHIPPING_FROM, quantity: 1 }], "shipping").shippingTotal, 0); });
test("retiro en tienda no cobra despacho", () => { assert.equal(calculateTotals([{ unitPrice: 1_000, quantity: 1 }], "pickup").total, 1_000); });
test("impide saltos inválidos de estado", () => { assert.equal(canTransitionOrder("PENDING", "COMPLETED"), false); assert.equal(canTransitionOrder("PENDING", "CONFIRMED"), true); assert.equal(canTransitionOrder("COMPLETED", "COMPLETED"), true); });
