"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTransitionOrder } from "@/lib/order-states";

async function staff() {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/auth/login");
  return user!;
}

async function audit(userId: string, action: string, entity: string, entityId: string, details?: unknown) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0];
  await db.auditLog.create({ data: { userId, action, entity, entityId, details: details ? JSON.stringify(details) : null, ip } });
}

const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const productCurrencyFields = {
  priceUsd: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().positive().max(1_000_000).optional()),
  usdToClpRate: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().positive().max(1_000_000).optional()),
};

function hasCompleteCurrencyReference(value: { priceUsd?: number; usdToClpRate?: number }) {
  return (value.priceUsd === undefined) === (value.usdToClpRate === undefined);
}

type ImageReference = { id?: string; data?: string };

function parseImageReferences(rawValue: string, maxImages: number, allowExisting: boolean): ImageReference[] | null {
  try {
    const value: unknown = JSON.parse(rawValue);
    if (!Array.isArray(value) || value.length > maxImages) return null;
    if (!value.every((item): item is ImageReference => {
      if (!item || typeof item !== "object") return false;
      const reference = item as ImageReference;
      const hasId = allowExisting && typeof reference.id === "string" && reference.id.length > 0;
      const hasData = typeof reference.data === "string" && reference.data.length <= 145_000 && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(reference.data);
      return hasId !== hasData;
    })) return null;
    return value;
  } catch {
    return null;
  }
}

function compatibilityDestination(formData: FormData, productId: string, result: { error?: string; ok?: string }) {
  if (formData.get("returnTo") !== "list") {
    const params = new URLSearchParams(result);
    return `/admin/products/${encodeURIComponent(productId)}?${params.toString()}`;
  }

  const params = new URLSearchParams();
  const query = String(formData.get("listQuery") ?? "").trim().slice(0, 100);
  const page = Number.parseInt(String(formData.get("listPage") ?? "1"), 10);
  if (query) params.set("q", query);
  if (Number.isFinite(page) && page > 1) params.set("page", String(page));
  params.set("compat", productId);
  if (result.error) params.set("error", result.error);
  if (result.ok) params.set("ok", result.ok);
  return `/admin/products?${params.toString()}`;
}

export async function createCategoryAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ name: z.string().trim().min(2).max(80), slug, description: z.string().trim().min(5).max(300), icon: z.enum(["brake", "engine", "light", "battery", "body"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/catalog?error=category");
  const row = await db.category.upsert({ where: { slug: parsed.data.slug }, update: { ...parsed.data, isActive: true }, create: parsed.data });
  await audit(user.id, "UPSERT", "Category", row.id, parsed.data);
  revalidatePath("/admin/catalog"); redirect("/admin/catalog?ok=category");
}

export async function createBrandAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ name: z.string().trim().min(2).max(80), slug }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/catalog?error=brand");
  const row = await db.brand.upsert({ where: { name: parsed.data.name }, update: { slug: parsed.data.slug, isActive: true }, create: parsed.data });
  await audit(user.id, "UPSERT", "Brand", row.id, parsed.data);
  revalidatePath("/admin/catalog"); redirect("/admin/catalog?ok=brand");
}

export async function createProductAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({
    name: z.string().trim().min(3).max(160),
    slug,
    sku: z.string().trim().min(3).max(60),
    shortDescription: z.string().trim().min(5).max(220),
    description: z.string().trim().min(10).max(2000),
    price: z.coerce.number().int().positive(),
    ...productCurrencyFields,
    stock: z.coerce.number().int().min(0),
    categoryId: z.string().min(1),
    brandId: z.string().trim().optional().transform((value) => value || undefined),
    oemCodes: z.string().max(500).default(""),
    featured: z.string().optional().transform((value) => value === "on"),
    imagesData: z.string().trim().max(800_000).default("[]"),
  }).refine(hasCompleteCurrencyReference, { path: ["usdToClpRate"] }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=invalid");
  let images: string[] = [];
  try {
    const value: unknown = JSON.parse(parsed.data.imagesData);
    if (!Array.isArray(value) || value.length > 5 || !value.every((item) => typeof item === "string" && item.length <= 145_000 && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(item))) {
      redirect("/admin/products?error=image");
    }
    images = value as string[];
  } catch {
    redirect("/admin/products?error=image");
  }
  if (parsed.data.featured && !images.length) redirect("/admin/products?error=featured-image");
  const location = await db.inventoryLocation.findFirst({ where: { isActive: true } });
  if (!location) redirect("/admin/products?error=location");
  const { oemCodes, brandId, imagesData: submittedImagesData, ...data } = parsed.data;
  void submittedImagesData;
  let product;
  try {
    product = await db.$transaction(async (tx) => {
      const row = await tx.product.create({ data: { ...data, brandId: brandId ?? null, oemCodes: JSON.stringify(oemCodes.split(",").map((item) => item.trim()).filter(Boolean)), icon: "engine" } });
      if (images.length) await tx.productImage.createMany({ data: images.map((image, position) => ({ productId: row.id, url: image, alt: `${row.name} - imagen ${position + 1}`, position })) });
      await tx.inventoryItem.create({ data: { productId: row.id, locationId: location.id, quantity: data.stock } });
      if (data.stock) await tx.inventoryMovement.create({ data: { productId: row.id, locationId: location.id, type: "INITIAL", quantity: data.stock, reason: "Alta de producto" } });
      return row;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect("/admin/products?error=duplicate");
    throw error;
  }
  await audit(user.id, "CREATE", "Product", product.id, { sku: product.sku, imageCount: images.length });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  if (product.featured) revalidatePath("/");
  redirect("/admin/products?ok=created");
}

export async function updateProductAction(formData: FormData) {
  const user = await staff();
  const productId = String(formData.get("id") ?? "");
  const returnTo = formData.get("returnTo") === "list" ? "list" : "detail";
  const destination = (suffix: string) => returnTo === "list"
    ? `/admin/products?${suffix}&edit=${encodeURIComponent(productId)}`
    : `/admin/products/${encodeURIComponent(productId)}?${suffix}`;
  const parsed = z.object({
    id: z.string().min(1),
    returnTo: z.enum(["detail", "list"]).default("detail"),
    name: z.string().trim().min(3).max(160),
    slug,
    sku: z.string().trim().min(3).max(60),
    shortDescription: z.string().trim().min(5).max(220),
    description: z.string().trim().min(10).max(2000),
    price: z.coerce.number().int().positive(),
    compareAtPrice: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().int().positive().optional()),
    ...productCurrencyFields,
    lowStockAt: z.coerce.number().int().min(0).max(100_000),
    condition: z.enum(["NEW", "REMANUFACTURED", "USED"]),
    categoryId: z.string().min(1),
    brandId: z.string().trim().optional().transform((value) => value || undefined),
    oemCodes: z.string().max(500).default(""),
    featured: z.string().optional().transform((value) => value === "on"),
    isActive: z.string().optional().transform((value) => value === "on"),
    imagesData: z.string().trim().max(800_000).default("[]"),
  }).refine(hasCompleteCurrencyReference, { path: ["usdToClpRate"] }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination("error=product-invalid"));

  type ImageReference = { id?: string; data?: string };
  let imageReferences: ImageReference[] = [];
  try {
    const value: unknown = JSON.parse(parsed.data.imagesData);
    if (!Array.isArray(value) || value.length > 5 || !value.every((item): item is ImageReference => {
      if (!item || typeof item !== "object") return false;
      const reference = item as ImageReference;
      const hasId = typeof reference.id === "string" && reference.id.length > 0;
      const hasData = typeof reference.data === "string" && reference.data.length <= 145_000 && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(reference.data);
      return hasId !== hasData;
    })) redirect(destination("error=product-image"));
    imageReferences = value;
  } catch {
    redirect(destination("error=product-image"));
  }
  if (parsed.data.featured && !imageReferences.length) redirect(destination("error=product-featured-image"));

  const current = await db.product.findUnique({ where: { id: parsed.data.id }, include: { images: { select: { id: true } } } });
  if (!current) redirect("/admin/products?error=invalid");
  const ownedImageIds = new Set(current.images.map((image) => image.id));
  const submittedImageIds = imageReferences.flatMap((image) => image.id ? [image.id] : []);
  if (submittedImageIds.some((id) => !ownedImageIds.has(id))) redirect(destination("error=product-image"));

  const { id, oemCodes, brandId, imagesData: submittedImagesData, returnTo: submittedReturnTo, ...data } = parsed.data;
  void submittedImagesData;
  void submittedReturnTo;
  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...data,
          brandId: brandId ?? null,
          compareAtPrice: data.compareAtPrice ?? null,
          priceUsd: data.priceUsd ?? null,
          usdToClpRate: data.usdToClpRate ?? null,
          oemCodes: JSON.stringify(oemCodes.split(",").map((item) => item.trim()).filter(Boolean)),
        },
      });
      await tx.productImage.deleteMany({
        where: { productId: id, ...(submittedImageIds.length ? { id: { notIn: submittedImageIds } } : {}) },
      });
      for (const [position, image] of imageReferences.entries()) {
        if (image.id) {
          await tx.productImage.updateMany({ where: { id: image.id, productId: id }, data: { position, alt: `${data.name} - imagen ${position + 1}` } });
        } else if (image.data) {
          await tx.productImage.create({ data: { productId: id, url: image.data, alt: `${data.name} - imagen ${position + 1}`, position } });
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect(destination("error=product-duplicate"));
    throw error;
  }

  await audit(user.id, "UPDATE", "Product", id, { sku: data.sku, imageCount: imageReferences.length, featured: data.featured });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
  revalidatePath(`/product/${current.slug}`);
  revalidatePath(`/product/${data.slug}`);
  revalidatePath("/");
  redirect(returnTo === "list" ? "/admin/products?ok=updated" : `/admin/products/${id}?ok=updated`);
}

export async function addProductCompatibilityAction(formData: FormData) {
  const user = await staff();
  const productId = String(formData.get("productId") ?? "");
  const parsed = z.object({ productId: z.string().min(1), vehicleModelId: z.string().min(1), yearFrom: z.coerce.number().int().min(1950).max(2100), yearTo: z.coerce.number().int().min(1950).max(2100), engine: z.string().trim().max(100).optional(), notes: z.string().trim().max(300).optional() }).refine((value) => value.yearTo >= value.yearFrom, { path: ["yearTo"] }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(compatibilityDestination(formData, productId, { error: "compatibility" }));
  const [product, vehicleModel, startYear, endYear] = await Promise.all([
    db.product.findUnique({ where: { id: parsed.data.productId } }),
    db.vehicleModel.findUnique({ where: { id: parsed.data.vehicleModelId }, include: { make: true } }),
    db.vehicleYear.findUnique({ where: { year: parsed.data.yearFrom } }),
    db.vehicleYear.findUnique({ where: { year: parsed.data.yearTo } }),
  ]);
  if (!product || !vehicleModel || !startYear || !endYear) redirect(compatibilityDestination(formData, parsed.data.productId, { error: "compatibility" }));
  const duplicate = await db.productCompatibility.findFirst({ where: { productId: product.id, vehicleModelId: vehicleModel.id, yearFrom: parsed.data.yearFrom, yearTo: parsed.data.yearTo, engine: parsed.data.engine || null } });
  if (!duplicate) {
    const row = await db.productCompatibility.create({ data: { productId: product.id, vehicleModelId: vehicleModel.id, make: vehicleModel.make.name, model: vehicleModel.name, yearFrom: parsed.data.yearFrom, yearTo: parsed.data.yearTo, engine: parsed.data.engine || null, notes: parsed.data.notes || null } });
    await audit(user.id, "CREATE", "ProductCompatibility", row.id, { productId: product.id, vehicleModelId: vehicleModel.id, yearFrom: row.yearFrom, yearTo: row.yearTo });
  }
  revalidatePath(`/admin/products/${product.id}`);
  revalidatePath(`/product/${product.slug}`);
  redirect(compatibilityDestination(formData, product.id, { ok: "compatibility" }));
}

export async function removeProductCompatibilityAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ id: z.string().min(1), productId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products");
  const row = await db.productCompatibility.findFirst({ where: { id: parsed.data.id, productId: parsed.data.productId }, include: { product: true } });
  if (!row) redirect(compatibilityDestination(formData, parsed.data.productId, { error: "compatibility" }));
  await db.productCompatibility.delete({ where: { id: row.id } });
  await audit(user.id, "DELETE", "ProductCompatibility", row.id, { productId: row.productId });
  revalidatePath(`/admin/products/${row.productId}`);
  revalidatePath(`/product/${row.product.slug}`);
  redirect(compatibilityDestination(formData, row.productId, { ok: "removed" }));
}

export async function toggleProductAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ id: z.string(), active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=invalid");
  const row = await db.product.update({ where: { id: parsed.data.id }, data: { isActive: parsed.data.active === "true" } });
  await audit(user.id, "STATUS_CHANGE", "Product", row.id, { isActive: row.isActive });
  revalidatePath("/admin/products"); redirect("/admin/products");
}

export async function createVehicleAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({
    slug,
    stockNumber: z.string().trim().min(3).max(60),
    vin: z.string().trim().max(40).optional().transform((value) => value || undefined),
    make: z.string().trim().min(2).max(80),
    model: z.string().trim().min(1).max(100),
    year: z.coerce.number().int().min(1950).max(2100),
    price: z.coerce.number().int().positive(),
    mileage: z.coerce.number().int().min(0),
    transmission: z.string().trim().min(2).max(50),
    fuel: z.string().trim().min(2).max(50),
    condition: z.string().trim().min(2).max(50),
    location: z.string().trim().min(2).max(120),
    color: z.string().trim().max(60).optional().transform((value) => value || undefined),
    engine: z.string().trim().max(100).optional().transform((value) => value || undefined),
    features: z.string().trim().max(1000).default(""),
    description: z.string().trim().min(10).max(2000),
    featured: z.string().optional().transform((value) => value === "on"),
    imagesData: z.string().trim().max(1_550_000).default("[]"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/vehicles?error=vehicle-invalid");
  const imageReferences = parseImageReferences(parsed.data.imagesData, 10, false);
  if (!imageReferences) redirect("/admin/vehicles?error=vehicle-image");
  const images = imageReferences.flatMap((image) => image.data ? [image.data] : []);
  const { vin, color, engine, features, imagesData: submittedImagesData, ...data } = parsed.data;
  void submittedImagesData;
  let row;
  try {
    row = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: {
          ...data,
          vin: vin ?? null,
          color: color ?? null,
          engine: engine ?? null,
          features: JSON.stringify(features.split(",").map((feature) => feature.trim()).filter(Boolean)),
        },
      });
      if (images.length) await tx.vehicleImage.createMany({ data: images.map((image, position) => ({ vehicleId: vehicle.id, url: image, alt: `${vehicle.year} ${vehicle.make} ${vehicle.model} - imagen ${position + 1}`, position })) });
      return vehicle;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect("/admin/vehicles?error=vehicle-duplicate");
    throw error;
  }
  await audit(user.id, "CREATE", "Vehicle", row.id, { stockNumber: row.stockNumber, imageCount: images.length });
  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
  revalidatePath("/");
  redirect("/admin/vehicles?ok=created");
}

export async function updateVehicleAction(formData: FormData) {
  const user = await staff();
  const vehicleId = String(formData.get("id") ?? "");
  const returnPage = Math.max(1, Number.parseInt(String(formData.get("returnPage") ?? "1"), 10) || 1);
  const pageParam = returnPage > 1 ? `page=${returnPage}&` : "";
  const destination = (result: string) => `/admin/vehicles?${pageParam}edit=${encodeURIComponent(vehicleId)}&${result}`;
  const parsed = z.object({
    id: z.string().min(1),
    slug,
    stockNumber: z.string().trim().min(3).max(60),
    vin: z.string().trim().max(40).optional().transform((value) => value || undefined),
    make: z.string().trim().min(2).max(80),
    model: z.string().trim().min(1).max(100),
    year: z.coerce.number().int().min(1950).max(2100),
    price: z.coerce.number().int().positive(),
    mileage: z.coerce.number().int().min(0),
    transmission: z.string().trim().min(2).max(50),
    fuel: z.string().trim().min(2).max(50),
    condition: z.string().trim().min(2).max(50),
    location: z.string().trim().min(2).max(120),
    color: z.string().trim().max(60).optional().transform((value) => value || undefined),
    engine: z.string().trim().max(100).optional().transform((value) => value || undefined),
    features: z.string().trim().max(1000).default(""),
    description: z.string().trim().min(10).max(2000),
    status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "INACTIVE"]),
    featured: z.string().optional().transform((value) => value === "on"),
    imagesData: z.string().trim().max(1_550_000).default("[]"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination("error=vehicle-invalid"));
  const imageReferences = parseImageReferences(parsed.data.imagesData, 10, true);
  if (!imageReferences) redirect(destination("error=vehicle-image"));
  const current = await db.vehicle.findUnique({ where: { id: parsed.data.id }, include: { images: { select: { id: true } } } });
  if (!current) redirect("/admin/vehicles?error=vehicle-missing");
  const ownedImageIds = new Set(current.images.map((image) => image.id));
  const submittedImageIds = imageReferences.flatMap((image) => image.id ? [image.id] : []);
  if (submittedImageIds.some((id) => !ownedImageIds.has(id))) redirect(destination("error=vehicle-image"));
  const { id, vin, color, engine, features, imagesData: submittedImagesData, ...data } = parsed.data;
  void submittedImagesData;
  try {
    await db.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: {
          ...data,
          vin: vin ?? null,
          color: color ?? null,
          engine: engine ?? null,
          features: JSON.stringify(features.split(",").map((feature) => feature.trim()).filter(Boolean)),
        },
      });
      await tx.vehicleImage.deleteMany({
        where: { vehicleId: id, ...(submittedImageIds.length ? { id: { notIn: submittedImageIds } } : {}) },
      });
      for (const [position, image] of imageReferences.entries()) {
        const alt = `${data.year} ${data.make} ${data.model} - imagen ${position + 1}`;
        if (image.id) {
          await tx.vehicleImage.updateMany({ where: { id: image.id, vehicleId: id }, data: { position, alt } });
        } else if (image.data) {
          await tx.vehicleImage.create({ data: { vehicleId: id, url: image.data, alt, position } });
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect(destination("error=vehicle-duplicate"));
    throw error;
  }
  await audit(user.id, "UPDATE", "Vehicle", id, { stockNumber: data.stockNumber, status: data.status, imageCount: imageReferences.length });
  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
  revalidatePath(`/vehicle/${current.slug}`);
  revalidatePath(`/vehicle/${data.slug}`);
  revalidatePath("/");
  redirect(`/admin/vehicles?${pageParam}ok=updated`);
}

export async function updateVehicleStatusAction(formData: FormData) {
  const user = await staff();
  const returnPage = Math.max(1, Number.parseInt(String(formData.get("returnPage") ?? "1"), 10) || 1);
  const pageParam = returnPage > 1 ? `page=${returnPage}&` : "";
  const parsed = z.object({ id: z.string(), status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "INACTIVE"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/vehicles?${pageParam}error=status`);
  const row = await db.vehicle.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  await audit(user.id, "STATUS_CHANGE", "Vehicle", row.id, { status: row.status });
  revalidatePath("/admin/vehicles");
  revalidatePath("/vehicles");
  revalidatePath(`/vehicle/${row.slug}`);
  revalidatePath("/");
  redirect(`/admin/vehicles?${pageParam}ok=${row.status === "AVAILABLE" ? "activated" : "deactivated"}`);
}

export async function adjustInventoryAction(formData: FormData) {
  const user = await staff();
  const returnPage = Math.max(1, Number.parseInt(String(formData.get("returnPage") ?? "1"), 10) || 1);
  const destination = (result: string) => `/admin/inventory?${returnPage > 1 ? `page=${returnPage}&` : ""}${result}`;
  const parsed = z.object({ itemId: z.string(), delta: z.coerce.number().int().min(-10000).max(10000).refine((n) => n !== 0), reason: z.string().trim().min(3).max(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination("error=invalid"));
  const item = await db.inventoryItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.quantity + parsed.data.delta < item.reserved) redirect(destination("error=negative"));
  await db.$transaction(async (tx) => { await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: parsed.data.delta } } }); await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: parsed.data.delta } } }); await tx.inventoryMovement.create({ data: { locationId: item.locationId, productId: item.productId, type: "ADJUSTMENT", quantity: parsed.data.delta, reason: parsed.data.reason, reference: `ADMIN:${user.id}` } }); });
  await audit(user.id, "ADJUST_INVENTORY", "InventoryItem", item.id, parsed.data);
  revalidatePath("/admin/inventory"); redirect(destination("ok=adjusted"));
}

export async function updateOrderAction(formData: FormData) {
  const user = await staff();
  const returnPage = Math.max(1, Number.parseInt(String(formData.get("returnPage") ?? "1"), 10) || 1);
  const destination = (result: string) => `/admin/orders?${returnPage > 1 ? `page=${returnPage}&` : ""}${result}`;
  const parsed = z.object({ id: z.string(), status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"]), paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]), fulfillmentStatus: z.enum(["UNFULFILLED", "READY", "SHIPPED", "DELIVERED", "CANCELLED"]), trackingCode: z.string().trim().max(100).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination("error=invalid"));
  const current = await db.order.findUnique({ where: { id: parsed.data.id } });
  if (!current || !canTransitionOrder(current.status, parsed.data.status)) redirect(destination("error=transition"));
  await db.$transaction(async (tx) => { await tx.order.update({ where: { id: current.id }, data: { status: parsed.data.status, paymentStatus: parsed.data.paymentStatus, fulfillmentStatus: parsed.data.fulfillmentStatus } }); await tx.payment.updateMany({ where: { orderId: current.id }, data: { status: parsed.data.paymentStatus } }); await tx.shipment.updateMany({ where: { orderId: current.id }, data: { status: parsed.data.fulfillmentStatus, trackingCode: parsed.data.trackingCode || undefined, shippedAt: parsed.data.fulfillmentStatus === "SHIPPED" ? new Date() : undefined, deliveredAt: parsed.data.fulfillmentStatus === "DELIVERED" ? new Date() : undefined } }); });
  await audit(user.id, "STATUS_CHANGE", "Order", current.id, parsed.data);
  revalidatePath("/admin/orders"); redirect(destination("ok=updated"));
}
