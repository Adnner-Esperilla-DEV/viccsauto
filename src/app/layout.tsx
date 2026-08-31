import type { Metadata } from "next";
import { inter } from "@/config/fonts";
import "./globals.css";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "ViccsAuto | Autopartes y vehículos en Arica", template: "%s | ViccsAuto" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "es_CL", siteName: siteConfig.name, title: "ViccsAuto | Autopartes y vehículos", description: siteConfig.description },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <body className={inter.className}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": ["Organization", "AutomotiveBusiness"], name: siteConfig.legalName, url: siteConfig.url, email: siteConfig.email, telephone: siteConfig.phone, address: { "@type": "PostalAddress", streetAddress: siteConfig.address, addressLocality: "Arica", addressCountry: siteConfig.country } }).replace(/</g, "\\u003c") }}/>{children}</body>
    </html>
  );
}
