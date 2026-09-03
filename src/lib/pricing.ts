export const DEFAULT_CUSTOMS_TAX_RATE_BPS = 2_614;

export const DELIVERY_ZONES = ["PICKUP_ARICA", "ARICA", "IQUIQUE", "REST_OF_CHILE"] as const;
export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

export function calculateTotals(
  items: Array<{ unitPrice: number; quantity: number }>,
  deliveryZone: DeliveryZone,
  customsTaxRateBps = DEFAULT_CUSTOMS_TAX_RATE_BPS,
) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingTotal = 0;
  const discountTotal = 0;
  const appliedTaxRateBps = deliveryZone === "REST_OF_CHILE" ? customsTaxRateBps : 0;
  const taxTotal = Math.round((subtotal * appliedTaxRateBps) / 10_000);
  const total = subtotal + shippingTotal + taxTotal - discountTotal;

  return { subtotal, shippingTotal, discountTotal, taxTotal, total };
}
