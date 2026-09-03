import "server-only";
import type { Prisma } from "@prisma/client";
import type { AutomotiveProduct, CategorySummary, ProductVehicleFilterOption, VehicleListing } from "@/interfaces";
import { db } from "@/lib/db";

const productInclude = {
  category: true,
  brand: true,
  images: { orderBy: { position: "asc" as const }, take: 5, select: { id: true } },
  compatibility: { include: { vehicleModel: { include: { make: true } } } },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function stringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function years(from: number | null, to: number | null) {
  if (!from) return "Consultar";
  return to && to !== from ? `${from}–${to}` : String(from);
}

export function mapProduct(record: ProductRecord): AutomotiveProduct {
  const images = record.images.map((image) => `/api/product-images/${image.id}`);
  return {
    id: record.id,
    slug: record.slug,
    sku: record.sku,
    name: record.name,
    shortDescription: record.shortDescription,
    description: record.description,
    category: record.category.name,
    categorySlug: record.category.slug,
    brand: record.brand?.name,
    price: record.price,
    compareAtPrice: record.compareAtPrice ?? undefined,
    stock: record.stock,
    condition: record.condition.toLowerCase() as AutomotiveProduct["condition"],
    oemCodes: stringArray(record.oemCodes),
    icon: record.icon as AutomotiveProduct["icon"],
    featured: record.featured,
    image: images[0],
    images,
    compatibility: record.compatibility.map((item) => ({
      make: item.vehicleModel.make.name,
      model: item.vehicleModel.name,
      years: years(item.yearFrom, item.yearTo),
      engine: item.engine ?? undefined,
    })),
  };
}

export async function listProducts(filters: { query?: string; category?: string; featured?: boolean; makeId?: string; modelId?: string; inStockOnly?: boolean } = {}) {
  const query = filters.query?.trim();
  const searchTerms = query?.split(/\s+/).filter(Boolean) ?? [];
  const records = await db.product.findMany({
    where: {
      isActive: true,
      stock: filters.inStockOnly ? { gt: 0 } : undefined,
      featured: filters.featured,
      images: filters.featured === true ? { some: {} } : undefined,
      category: filters.category ? { slug: filters.category, isActive: true } : { isActive: true },
      compatibility: filters.modelId
        ? { some: { vehicleModelId: filters.modelId, vehicleModel: filters.makeId ? { makeId: filters.makeId } : undefined } }
        : filters.makeId
          ? { some: { vehicleModel: { makeId: filters.makeId } } }
          : undefined,
      AND: searchTerms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { oemCodes: { contains: term, mode: "insensitive" } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
          { compatibility: { some: { vehicleModel: { name: { contains: term, mode: "insensitive" } } } } },
          { compatibility: { some: { vehicleModel: { make: { name: { contains: term, mode: "insensitive" } } } } } },
        ],
      })),
    },
    include: productInclude,
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
  return records.map(mapProduct);
}

export async function listProductVehicleFilterOptions(): Promise<ProductVehicleFilterOption[]> {
  const compatibility = await db.productCompatibility.findMany({
    where: {
      product: { isActive: true, stock: { gt: 0 }, category: { isActive: true } },
      vehicleModel: { isActive: true, make: { isActive: true } },
    },
    select: {
      vehicleModel: {
        select: {
          id: true,
          name: true,
          make: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { vehicleModel: { make: { name: "asc" } } },
      { vehicleModel: { name: "asc" } },
    ],
  });

  const makes = new Map<string, ProductVehicleFilterOption>();
  for (const row of compatibility) {
    const { make } = row.vehicleModel;
    const option = makes.get(make.id) ?? { id: make.id, name: make.name, models: [] };
    if (!option.models.some((model) => model.id === row.vehicleModel.id)) {
      option.models.push({ id: row.vehicleModel.id, name: row.vehicleModel.name });
    }
    makes.set(make.id, option);
  }
  return [...makes.values()];
}

export async function getProductBySlug(slug: string) {
  const record = await db.product.findFirst({ where: { slug, isActive: true }, include: productInclude });
  return record ? mapProduct(record) : null;
}

export async function listCategories(): Promise<CategorySummary[]> {
  const rows = await db.category.findMany({ where: { isActive: true }, orderBy: [{ position: "asc" }, { name: "asc" }] });
  return rows.map((row) => ({ slug: row.slug, name: row.name, description: row.description, icon: row.icon as CategorySummary["icon"] }));
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } });
}

const vehicleInclude = {
  images: { orderBy: { position: "asc" as const }, take: 10, select: { id: true } },
} satisfies Prisma.VehicleInclude;

type VehicleRecord = Prisma.VehicleGetPayload<{ include: typeof vehicleInclude }>;

function mapVehicle(row: VehicleRecord): VehicleListing {
  const images = row.images.map((image) => `/api/vehicle-images/${image.id}`);
  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    year: row.year,
    price: row.price,
    mileage: row.mileage,
    transmission: row.transmission as VehicleListing["transmission"],
    fuel: row.fuel as VehicleListing["fuel"],
    condition: row.condition as VehicleListing["condition"],
    location: row.location,
    description: row.description,
    featured: row.featured,
    image: images[0],
    images,
  };
}

export async function listVehicles(featured?: boolean) {
  const rows = await db.vehicle.findMany({ where: { status: "AVAILABLE", featured }, include: vehicleInclude, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });
  return rows.map(mapVehicle);
}

export async function getVehicleBySlug(slug: string) {
  const row = await db.vehicle.findFirst({ where: { slug, status: "AVAILABLE" }, include: vehicleInclude });
  return row ? mapVehicle(row) : null;
}
