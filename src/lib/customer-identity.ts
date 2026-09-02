export const GENERIC_CUSTOMER_EMAIL = "presencial@viccsauto.local";
export const INTERNAL_CUSTOMER_EMAIL_SUFFIX = "@viccsauto.local";

export function normalizeCustomerPhone(value: string | null | undefined) {
  let digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  if (digits.startsWith("0056")) digits = digits.slice(2);
  if (digits.length === 9) digits = `56${digits}`;
  return digits;
}

export function splitCustomerName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Cliente", lastName: "Presencial" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Presencial" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function customerDisplayName(customer: { firstName: string; lastName: string }) {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function isInternalCustomerEmail(email: string) {
  return email.endsWith(INTERNAL_CUSTOMER_EMAIL_SUFFIX);
}
