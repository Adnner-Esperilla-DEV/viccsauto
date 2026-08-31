"use server";

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
  const parsed = z.object({ name: z.string().trim().min(3).max(160), slug, sku: z.string().trim().min(3).max(60), shortDescription: z.string().trim().min(5).max(220), description: z.string().trim().min(10).max(2000), price: z.coerce.number().int().positive(), stock: z.coerce.number().int().min(0), categoryId: z.string().min(1), brandId: z.string().trim().optional().transform((value) => value || undefined), oemCodes: z.string().max(500).default("") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products?error=invalid");
  const location = await db.inventoryLocation.findFirst({ where: { isActive: true } });
  if (!location) redirect("/admin/products?error=location");
  const { oemCodes, brandId, ...data } = parsed.data;
  const product = await db.$transaction(async (tx) => {
    const row = await tx.product.create({ data: { ...data, brandId: brandId ?? null, oemCodes: JSON.stringify(oemCodes.split(",").map((item) => item.trim()).filter(Boolean)), icon: "engine" } });
    await tx.inventoryItem.create({ data: { productId: row.id, locationId: location.id, quantity: data.stock } });
    if (data.stock) await tx.inventoryMovement.create({ data: { productId: row.id, locationId: location.id, type: "INITIAL", quantity: data.stock, reason: "Alta de producto" } });
    return row;
  });
  await audit(user.id, "CREATE", "Product", product.id, { sku: product.sku });
  revalidatePath("/admin/products"); redirect("/admin/products?ok=created");
}

export async function addProductCompatibilityAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ productId: z.string().min(1), vehicleModelId: z.string().min(1), yearFrom: z.coerce.number().int().min(1950).max(2100), yearTo: z.coerce.number().int().min(1950).max(2100), engine: z.string().trim().max(100).optional(), notes: z.string().trim().max(300).optional() }).refine((value) => value.yearTo >= value.yearFrom, { path: ["yearTo"] }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/products/${String(formData.get("productId") ?? "")}?error=compatibility`);
  const [product, vehicleModel, startYear, endYear] = await Promise.all([
    db.product.findUnique({ where: { id: parsed.data.productId } }),
    db.vehicleModel.findUnique({ where: { id: parsed.data.vehicleModelId }, include: { make: true } }),
    db.vehicleYear.findUnique({ where: { year: parsed.data.yearFrom } }),
    db.vehicleYear.findUnique({ where: { year: parsed.data.yearTo } }),
  ]);
  if (!product || !vehicleModel || !startYear || !endYear) redirect(`/admin/products/${parsed.data.productId}?error=compatibility`);
  const duplicate = await db.productCompatibility.findFirst({ where: { productId: product.id, vehicleModelId: vehicleModel.id, yearFrom: parsed.data.yearFrom, yearTo: parsed.data.yearTo, engine: parsed.data.engine || null } });
  if (!duplicate) {
    const row = await db.productCompatibility.create({ data: { productId: product.id, vehicleModelId: vehicleModel.id, make: vehicleModel.make.name, model: vehicleModel.name, yearFrom: parsed.data.yearFrom, yearTo: parsed.data.yearTo, engine: parsed.data.engine || null, notes: parsed.data.notes || null } });
    await audit(user.id, "CREATE", "ProductCompatibility", row.id, { productId: product.id, vehicleModelId: vehicleModel.id, yearFrom: row.yearFrom, yearTo: row.yearTo });
  }
  revalidatePath(`/admin/products/${product.id}`);
  revalidatePath(`/product/${product.slug}`);
  redirect(`/admin/products/${product.id}?ok=compatibility`);
}

export async function removeProductCompatibilityAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ id: z.string().min(1), productId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/products");
  const row = await db.productCompatibility.findFirst({ where: { id: parsed.data.id, productId: parsed.data.productId }, include: { product: true } });
  if (!row) redirect(`/admin/products/${parsed.data.productId}`);
  await db.productCompatibility.delete({ where: { id: row.id } });
  await audit(user.id, "DELETE", "ProductCompatibility", row.id, { productId: row.productId });
  revalidatePath(`/admin/products/${row.productId}`);
  revalidatePath(`/product/${row.product.slug}`);
  redirect(`/admin/products/${row.productId}?ok=removed`);
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
  const parsed = z.object({ slug, stockNumber: z.string().trim().min(3), make: z.string().trim().min(2), model: z.string().trim().min(1), year: z.coerce.number().int().min(1950).max(2100), price: z.coerce.number().int().positive(), mileage: z.coerce.number().int().min(0), transmission: z.string().trim().min(2), fuel: z.string().trim().min(2), condition: z.string().trim().min(2), location: z.string().trim().min(2), description: z.string().trim().min(10).max(2000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/vehicles?error=invalid");
  const row = await db.vehicle.create({ data: parsed.data });
  await audit(user.id, "CREATE", "Vehicle", row.id, { stockNumber: row.stockNumber });
  revalidatePath("/admin/vehicles"); redirect("/admin/vehicles?ok=created");
}

export async function updateVehicleStatusAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ id: z.string(), status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "INACTIVE"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/vehicles?error=status");
  const row = await db.vehicle.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  await audit(user.id, "STATUS_CHANGE", "Vehicle", row.id, { status: row.status });
  revalidatePath("/admin/vehicles"); redirect("/admin/vehicles");
}

export async function adjustInventoryAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ itemId: z.string(), delta: z.coerce.number().int().min(-10000).max(10000).refine((n) => n !== 0), reason: z.string().trim().min(3).max(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/inventory?error=invalid");
  const item = await db.inventoryItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.quantity + parsed.data.delta < item.reserved) redirect("/admin/inventory?error=negative");
  await db.$transaction(async (tx) => { await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: parsed.data.delta } } }); await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: parsed.data.delta } } }); await tx.inventoryMovement.create({ data: { locationId: item.locationId, productId: item.productId, type: "ADJUSTMENT", quantity: parsed.data.delta, reason: parsed.data.reason, reference: `ADMIN:${user.id}` } }); });
  await audit(user.id, "ADJUST_INVENTORY", "InventoryItem", item.id, parsed.data);
  revalidatePath("/admin/inventory"); redirect("/admin/inventory?ok=adjusted");
}

export async function updateOrderAction(formData: FormData) {
  const user = await staff();
  const parsed = z.object({ id: z.string(), status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"]), paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]), fulfillmentStatus: z.enum(["UNFULFILLED", "READY", "SHIPPED", "DELIVERED", "CANCELLED"]), trackingCode: z.string().trim().max(100).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/orders?error=invalid");
  const current = await db.order.findUnique({ where: { id: parsed.data.id } });
  if (!current || !canTransitionOrder(current.status, parsed.data.status)) redirect("/admin/orders?error=transition");
  await db.$transaction(async (tx) => { await tx.order.update({ where: { id: current.id }, data: { status: parsed.data.status, paymentStatus: parsed.data.paymentStatus, fulfillmentStatus: parsed.data.fulfillmentStatus } }); await tx.payment.updateMany({ where: { orderId: current.id }, data: { status: parsed.data.paymentStatus } }); await tx.shipment.updateMany({ where: { orderId: current.id }, data: { status: parsed.data.fulfillmentStatus, trackingCode: parsed.data.trackingCode || undefined, shippedAt: parsed.data.fulfillmentStatus === "SHIPPED" ? new Date() : undefined, deliveredAt: parsed.data.fulfillmentStatus === "DELIVERED" ? new Date() : undefined } }); });
  await audit(user.id, "STATUS_CHANGE", "Order", current.id, parsed.data);
  revalidatePath("/admin/orders"); redirect("/admin/orders?ok=updated");
}
