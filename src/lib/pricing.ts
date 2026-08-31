export const FREE_SHIPPING_FROM = 100_000;
export const STANDARD_SHIPPING = 5_990;

export function calculateTotals(items: Array<{ unitPrice: number; quantity: number }>, delivery: "pickup" | "shipping") {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingTotal = delivery === "pickup" || subtotal >= FREE_SHIPPING_FROM ? 0 : STANDARD_SHIPPING;
  const discountTotal = 0;
  const taxTotal = 0; // Los precios CLP publicados incluyen IVA.
  return { subtotal, shippingTotal, discountTotal, taxTotal, total: subtotal + shippingTotal - discountTotal };
}
