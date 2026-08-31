import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, vehicles] = await Promise.all([db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }), db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }), db.vehicle.findMany({ where: { status: "AVAILABLE" }, select: { slug: true, updatedAt: true } })]);
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = ["", "/products", "/vehicles", "/contact", "/about", "/warranty", "/returns", "/privacy", "/terms"].map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: now, changeFrequency: "weekly", priority: path === "" ? 1 : 0.6 }));
  return [...staticPages, ...categories.map((row) => ({ url: `${siteConfig.url}/category/${row.slug}`, lastModified: row.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })), ...products.map((row) => ({ url: `${siteConfig.url}/product/${row.slug}`, lastModified: row.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })), ...vehicles.map((row) => ({ url: `${siteConfig.url}/vehicle/${row.slug}`, lastModified: row.updatedAt, changeFrequency: "daily" as const, priority: 0.8 }))];
}
