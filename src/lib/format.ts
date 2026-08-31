import { siteConfig } from "@/config/site";

export function formatPrice(value: number) {
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency: siteConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function absoluteUrl(path = "") {
  return new URL(path, siteConfig.url).toString();
}
