"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getImportFinanceSummary } from "@/lib/import-finances";
import { deleteObjectsBestEffort, uploadObject } from "@/lib/object-storage";
import { extractImagesFromZip } from "@/lib/zip-images";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const optionalNumber = z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().nonnegative().optional());
const optionalInteger = z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().int().optional());
const usdAmount = z.preprocess(
  (value) => value === "" || value == null ? 0 : value,
  z.coerce.number().finite().nonnegative().max(9_999_999_999.99),
);
const importStatusSchema = z.enum(["INCOMING", "RECEIVED", "ASSIGNED", "LOADED", "SHIPPED", "FINALIZED"]);
const allowedAttachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const importDataSchema = z.object({
  importType: z.enum(["VEHICLE", "PARTS"]),
  customerId: z.string().min(1),
  vin: optionalText(25).transform((value) => value?.toUpperCase()),
  year: optionalInteger,
  makeId: optionalText(100),
  modelId: optionalText(100),
  color: optionalText(60).transform((value) => value?.toUpperCase()),
  lotNumber: optionalText(60),
  weightKg: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().int().positive().max(100_000).optional()),
  valueUsd: optionalNumber,
  towingCostUsd: usdAmount,
  oceanFreightUsd: usdAmount,
  shippingCostUsd: usdAmount,
  logisticsServiceUsd: usdAmount,
  otherChargesUsd: usdAmount,
  paidAmountUsd: usdAmount,
  loadType: optionalText(30),
  destinationPort: optionalText(160),
  receivedDate: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.date().optional()),
  hazmat: z.enum(["yes", "no"]).transform((value) => value === "yes"),
  fuel: optionalText(50),
  keyStatus: z.enum(["NO_KEY", "UNKNOWN", "KEY_PRESENT"]).optional().default("UNKNOWN"),
  titleStatus: z.enum(["NO_TITLE", "PENDING", "RECEIVED"]).optional().default("PENDING"),
  titleNumber: optionalText(80),
  titleState: optionalText(20),
  scheduleB: optionalText(80),
  customerParty: optionalText(160),
  shipper: optionalText(160),
  consignee: optionalText(160),
  notifyParty: optionalText(160),
  exportReference: optionalText(160),
  containerNumber: optionalText(80),
  shippingLine: optionalText(120),
  departureDate: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.date().optional()),
  arrivalDate: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.date().optional()),
  arrivalPlace: optionalText(160),
  status: importStatusSchema,
}).superRefine((value, context) => {
  if (value.importType === "VEHICLE") {
    if (!value.vin || value.vin.length < 11) context.addIssue({ code: "custom", path: ["vin"], message: "VIN obligatorio." });
    if (!value.year || value.year < 1900 || value.year > 2100) context.addIssue({ code: "custom", path: ["year"], message: "Año obligatorio." });
    if (!value.makeId) context.addIssue({ code: "custom", path: ["makeId"], message: "Marca obligatoria." });
    if (!value.modelId) context.addIssue({ code: "custom", path: ["modelId"], message: "Modelo obligatorio." });
    if (!value.color || value.color.length < 2) context.addIssue({ code: "custom", path: ["color"], message: "Color obligatorio." });
  }
  if (value.departureDate && value.arrivalDate && value.arrivalDate < value.departureDate) {
    context.addIssue({ code: "custom", path: ["arrivalDate"], message: "La fecha de llegada no puede ser anterior a la fecha de embarque." });
  }
});

const importedPartSchema = z.object({
  description: z.string().trim().min(2).max(160),
  partNumber: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()),
  partBrand: optionalText(80),
  quantity: z.coerce.number().int().min(1).max(10_000),
  unitValueUsd: z.coerce.number().finite().nonnegative().max(9_999_999_999.99),
  weightKg: optionalNumber,
  makeId: z.string().min(1),
  modelId: z.string().min(1),
  yearFrom: z.coerce.number().int().min(1900).max(2100),
  yearTo: z.coerce.number().int().min(1900).max(2100),
  engine: optionalText(80),
}).refine((part) => part.yearTo >= part.yearFrom, { path: ["yearTo"], message: "El año final no puede ser menor al inicial." });

function parseParts(formData: FormData) {
  try {
    return z.array(importedPartSchema).min(1).max(50).safeParse(JSON.parse(String(formData.get("partsJson") ?? "[]")));
  } catch {
    return z.array(importedPartSchema).min(1).max(50).safeParse([]);
  }
}

function newReferenceCode() {
  return `IMP-${new Date().getFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function audit(userId: string, action: string, entityId: string, details?: unknown) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0];
  await db.auditLog.create({ data: { userId, action, entity: "VehicleImport", entityId, details: details ? JSON.stringify(details) : null, ip } });
}

function importError(code: string): never {
  redirect(`/admin/imports/new?error=${encodeURIComponent(code)}`);
}

type UploadableFile = { data: Uint8Array; filename: string; mimeType: string; size?: number };

async function uploadFiles(files: UploadableFile[], prefix: string) {
  const uploaded: Array<UploadableFile & { storageKey: string }> = [];
  try {
    for (const file of files) {
      const storageKey = await uploadObject({ body: file.data, contentType: file.mimeType, filename: file.filename, prefix });
      uploaded.push({ ...file, storageKey });
    }
    return uploaded;
  } catch (error) {
    await deleteObjectsBestEffort(uploaded.map((file) => file.storageKey));
    throw error;
  }
}

async function partsHaveValidCompatibility(parts: z.infer<typeof importedPartSchema>[]) {
  const modelIds = [...new Set(parts.map((part) => part.modelId))];
  const models = await db.vehicleModel.findMany({ where: { id: { in: modelIds }, isActive: true, make: { isActive: true } }, select: { id: true, makeId: true } });
  const makeByModel = new Map(models.map((model) => [model.id, model.makeId]));
  return parts.every((part) => makeByModel.get(part.modelId) === part.makeId);
}

export async function createVehicleImportAction(formData: FormData) {
  const user = await requireStaff();
  const noteResult = z.preprocess((value) => value === "" || value == null ? undefined : value, z.string().trim().max(2000).optional()).safeParse(formData.get("initialNote"));
  if (!noteResult.success) importError("invalid");
  const initialNote = noteResult.data;
  const parsed = importDataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) importError("invalid");
  const partsResult = parseParts(formData);
  if (parsed.data.importType === "PARTS" && !partsResult.success) importError("invalid");
  const parts = parsed.data.importType === "PARTS" && partsResult.success ? partsResult.data : [];

  const [customer, selectedVehicleModel, validParts] = await Promise.all([
    db.user.findFirst({ where: { id: parsed.data.customerId, role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } }, select: { id: true } }),
    parsed.data.importType === "VEHICLE" ? db.vehicleModel.findFirst({ where: { id: parsed.data.modelId, makeId: parsed.data.makeId, isActive: true, make: { isActive: true } }, select: { name: true, make: { select: { name: true } } } }) : null,
    parsed.data.importType === "PARTS" ? partsHaveValidCompatibility(parts) : true,
  ]);
  if (!customer) importError("customer");
  if (parsed.data.importType === "VEHICLE" && !selectedVehicleModel) importError("invalid");
  if (!validParts) importError("invalid");

  const goodsValueUsd = parts.reduce((totalCents, part) => totalCents + Math.round(part.unitValueUsd * 100) * part.quantity, 0) / 100;
  const finance = getImportFinanceSummary({ importType: parsed.data.importType, valueUsd: parsed.data.importType === "PARTS" ? goodsValueUsd : parsed.data.valueUsd, towingCostUsd: parsed.data.towingCostUsd, oceanFreightUsd: parsed.data.oceanFreightUsd, shippingCostUsd: parsed.data.shippingCostUsd, logisticsServiceUsd: parsed.data.logisticsServiceUsd, otherChargesUsd: parsed.data.otherChargesUsd, paidAmountUsd: parsed.data.paidAmountUsd });
  if (Math.round(finance.paidAmountUsd * 100) > Math.round(finance.totalUsd * 100)) importError("payment");

  const zipFile = formData.get("imageZip");
  if (!(zipFile instanceof File) || !zipFile.size || zipFile.size > 30 * 1024 * 1024 || !/\.zip$/i.test(zipFile.name)) importError("zip");
  let images;
  try {
    images = extractImagesFromZip(Buffer.from(await zipFile.arrayBuffer()));
  } catch {
    importError("zip");
  }

  const attachmentFiles = formData.getAll("attachments").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (attachmentFiles.length > 5 || attachmentFiles.some((file) => file.size > 5 * 1024 * 1024 || !allowedAttachmentTypes.has(file.type)) || attachmentFiles.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) importError("attachments");
  const attachments = await Promise.all(attachmentFiles.map(async (file) => ({ filename: file.name.slice(0, 180), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) })));

  let uploadedImages: Awaited<ReturnType<typeof uploadFiles>> = [];
  let uploadedAttachments: Awaited<ReturnType<typeof uploadFiles>> = [];
  try {
    uploadedImages = await uploadFiles(images, "imports/images");
    uploadedAttachments = await uploadFiles(attachments, "imports/attachments");
  } catch {
    await deleteObjectsBestEffort([...uploadedImages, ...uploadedAttachments].map((file) => file.storageKey));
    importError("storage");
  }

  let vehicleImport;
  try {
    const data = parsed.data;
    vehicleImport = await db.$transaction(async (tx) => {
      const row = await tx.vehicleImport.create({ data: {
        importType: data.importType, referenceCode: newReferenceCode(), customerId: data.customerId,
        vin: data.importType === "VEHICLE" ? data.vin : null, year: data.importType === "VEHICLE" ? data.year : null,
        makeId: data.importType === "VEHICLE" ? data.makeId : null, make: data.importType === "VEHICLE" ? selectedVehicleModel?.make.name : null,
        modelId: data.importType === "VEHICLE" ? data.modelId : null, model: data.importType === "VEHICLE" ? selectedVehicleModel?.name : null,
        color: data.importType === "VEHICLE" ? data.color : null, fuel: data.importType === "VEHICLE" ? data.fuel : null,
        weightKg: data.importType === "VEHICLE" ? data.weightKg : null,
        valueUsd: data.importType === "PARTS" ? goodsValueUsd : data.valueUsd ?? null,
        towingCostUsd: data.importType === "VEHICLE" ? data.towingCostUsd : 0, oceanFreightUsd: data.importType === "VEHICLE" ? data.oceanFreightUsd : 0,
        shippingCostUsd: data.importType === "PARTS" ? data.shippingCostUsd : 0, logisticsServiceUsd: data.importType === "PARTS" ? data.logisticsServiceUsd : 0,
        otherChargesUsd: data.otherChargesUsd,
        paidAmountUsd: data.paidAmountUsd, lotNumber: data.lotNumber, loadType: data.loadType, destinationPort: data.destinationPort,
        receivedDate: data.receivedDate, hazmat: data.hazmat, keyStatus: data.importType === "VEHICLE" ? data.keyStatus : "UNKNOWN",
        titleStatus: data.importType === "VEHICLE" ? data.titleStatus : "PENDING", titleNumber: data.importType === "VEHICLE" ? data.titleNumber : null,
        titleState: data.importType === "VEHICLE" ? data.titleState : null, scheduleB: data.importType === "VEHICLE" ? data.scheduleB : null,
        customerParty: data.customerParty, shipper: data.shipper, consignee: data.consignee, notifyParty: data.notifyParty,
        exportReference: data.exportReference, containerNumber: data.containerNumber, shippingLine: data.shippingLine,
        departureDate: data.departureDate, arrivalDate: data.arrivalDate, arrivalPlace: data.arrivalPlace, status: data.status,
      } });
      if (parts.length) await tx.importedPart.createMany({ data: parts.map((part, position) => ({ importId: row.id, description: part.description, partNumber: part.partNumber, partBrand: part.partBrand, quantity: part.quantity, unitValueUsd: part.unitValueUsd, weightKg: part.weightKg, makeId: part.makeId, modelId: part.modelId, yearFrom: part.yearFrom, yearTo: part.yearTo, engine: part.engine, position })) });
      await tx.vehicleImportImage.createMany({ data: uploadedImages.map((image, position) => ({ importId: row.id, filename: image.filename, mimeType: image.mimeType, storageKey: image.storageKey, position })) });
      if (uploadedAttachments.length) await tx.vehicleImportAttachment.createMany({ data: uploadedAttachments.map((attachment) => ({ importId: row.id, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size ?? attachment.data.length, storageKey: attachment.storageKey })) });
      if (initialNote) await tx.vehicleImportNote.create({ data: { importId: row.id, authorId: user.id, body: initialNote, visibleToCustomer: true } });
      return row;
    });
  } catch (error) {
    await deleteObjectsBestEffort([...uploadedImages, ...uploadedAttachments].map((file) => file.storageKey));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") importError("duplicate");
    throw error;
  }

  await audit(user.id, "CREATE", vehicleImport.id, { importType: vehicleImport.importType, referenceCode: vehicleImport.referenceCode, vin: vehicleImport.vin, customerId: customer.id, partCount: parts.length, otherChargesUsd: vehicleImport.otherChargesUsd, paidAmountUsd: vehicleImport.paidAmountUsd, imageCount: images.length, attachmentCount: attachments.length, initialCustomerNote: Boolean(initialNote) });
  revalidatePath("/admin/imports");
  revalidatePath("/imports");
  redirect(`/admin/imports/${vehicleImport.id}?ok=created`);
}

export async function updateVehicleImportAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = importDataSchema.safeExtend({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  const fallbackId = encodeURIComponent(String(formData.get("id") ?? ""));
  if (!parsed.success) {
    redirect(`/admin/imports/${fallbackId}/edit?error=invalid`);
  }
  const data = parsed.data;
  const partsResult = parseParts(formData);
  if (data.importType === "PARTS" && !partsResult.success) redirect(`/admin/imports/${fallbackId}/edit?error=invalid`);
  const parts = data.importType === "PARTS" && partsResult.success ? partsResult.data : [];
  const [existing, customer, selectedVehicleModel, validParts] = await Promise.all([
    db.vehicleImport.findUnique({ where: { id: data.id }, select: { id: true, customerId: true, importType: true } }),
    db.user.findFirst({ where: { id: data.customerId, role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } }, select: { id: true } }),
    data.importType === "VEHICLE" ? db.vehicleModel.findFirst({ where: { id: data.modelId, makeId: data.makeId, isActive: true, make: { isActive: true } }, select: { name: true, make: { select: { name: true } } } }) : null,
    data.importType === "PARTS" ? partsHaveValidCompatibility(parts) : true,
  ]);
  if (!existing) redirect("/admin/imports");
  if (existing.importType !== data.importType) redirect(`/admin/imports/${data.id}/edit?error=invalid`);
  if (!customer) redirect(`/admin/imports/${data.id}/edit?error=customer`);
  if (data.importType === "VEHICLE" && !selectedVehicleModel) redirect(`/admin/imports/${data.id}/edit?error=invalid`);
  if (!validParts) redirect(`/admin/imports/${data.id}/edit?error=invalid`);
  const goodsValueUsd = parts.reduce((totalCents, part) => totalCents + Math.round(part.unitValueUsd * 100) * part.quantity, 0) / 100;
  const finance = getImportFinanceSummary({ importType: data.importType, valueUsd: data.importType === "PARTS" ? goodsValueUsd : data.valueUsd, towingCostUsd: data.towingCostUsd, oceanFreightUsd: data.oceanFreightUsd, shippingCostUsd: data.shippingCostUsd, logisticsServiceUsd: data.logisticsServiceUsd, otherChargesUsd: data.otherChargesUsd, paidAmountUsd: data.paidAmountUsd });
  if (Math.round(finance.paidAmountUsd * 100) > Math.round(finance.totalUsd * 100)) redirect(`/admin/imports/${data.id}/edit?error=payment`);
  const { id } = data;
  try {
    await db.$transaction(async (tx) => {
      await tx.vehicleImport.update({ where: { id }, data: {
        customerId: data.customerId, vin: data.importType === "VEHICLE" ? data.vin : null, year: data.importType === "VEHICLE" ? data.year : null,
        makeId: data.importType === "VEHICLE" ? data.makeId : null, make: data.importType === "VEHICLE" ? selectedVehicleModel?.make.name : null,
        modelId: data.importType === "VEHICLE" ? data.modelId : null, model: data.importType === "VEHICLE" ? selectedVehicleModel?.name : null,
        color: data.importType === "VEHICLE" ? data.color : null, fuel: data.importType === "VEHICLE" ? data.fuel : null,
        weightKg: data.importType === "VEHICLE" ? data.weightKg : null, valueUsd: data.importType === "PARTS" ? goodsValueUsd : data.valueUsd ?? null,
        towingCostUsd: data.importType === "VEHICLE" ? data.towingCostUsd : 0, oceanFreightUsd: data.importType === "VEHICLE" ? data.oceanFreightUsd : 0,
        shippingCostUsd: data.importType === "PARTS" ? data.shippingCostUsd : 0, logisticsServiceUsd: data.importType === "PARTS" ? data.logisticsServiceUsd : 0,
        otherChargesUsd: data.otherChargesUsd,
        paidAmountUsd: data.paidAmountUsd, lotNumber: data.lotNumber ?? null, loadType: data.loadType ?? null, destinationPort: data.destinationPort ?? null,
        receivedDate: data.receivedDate ?? null, hazmat: data.hazmat, keyStatus: data.importType === "VEHICLE" ? data.keyStatus : "UNKNOWN",
        titleStatus: data.importType === "VEHICLE" ? data.titleStatus : "PENDING", titleNumber: data.importType === "VEHICLE" ? data.titleNumber ?? null : null,
        titleState: data.importType === "VEHICLE" ? data.titleState ?? null : null, scheduleB: data.importType === "VEHICLE" ? data.scheduleB ?? null : null,
        containerNumber: data.containerNumber ?? null, shippingLine: data.shippingLine ?? null, departureDate: data.departureDate ?? null,
        arrivalDate: data.arrivalDate ?? null, arrivalPlace: data.arrivalPlace ?? null, status: data.status,
      } });
      await tx.importedPart.deleteMany({ where: { importId: id } });
      if (parts.length) await tx.importedPart.createMany({ data: parts.map((part, position) => ({ importId: id, description: part.description, partNumber: part.partNumber, partBrand: part.partBrand, quantity: part.quantity, unitValueUsd: part.unitValueUsd, weightKg: part.weightKg, makeId: part.makeId, modelId: part.modelId, yearFrom: part.yearFrom, yearTo: part.yearTo, engine: part.engine, position })) });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect(`/admin/imports/${id}/edit?error=duplicate`);
    throw error;
  }
  await audit(user.id, "UPDATE", id, { importType: data.importType, previousCustomerId: existing.customerId, customerId: customer.id, partCount: parts.length, otherChargesUsd: data.otherChargesUsd, paidAmountUsd: data.paidAmountUsd });
  revalidatePath("/admin/imports");
  revalidatePath(`/admin/imports/${id}`);
  revalidatePath("/imports");
  revalidatePath(`/imports/${id}`);
  redirect(`/admin/imports/${id}?ok=updated`);
}

export async function addVehicleImportImagesAction(formData: FormData) {
  const user = await requireStaff();
  const importId = z.string().min(1).safeParse(formData.get("importId"));
  if (!importId.success) redirect("/admin/imports");
  const exists = await db.vehicleImport.findUnique({ where: { id: importId.data }, select: { id: true } });
  if (!exists) redirect("/admin/imports");
  const zipFile = formData.get("imageZip");
  if (!(zipFile instanceof File) || !zipFile.size || zipFile.size > 30 * 1024 * 1024 || !/\.zip$/i.test(zipFile.name)) redirect(`/admin/imports/${exists.id}?error=zip`);
  let images;
  try {
    images = extractImagesFromZip(Buffer.from(await zipFile.arrayBuffer()));
  } catch {
    redirect(`/admin/imports/${exists.id}?error=zip`);
  }
  const lastImage = await db.vehicleImportImage.aggregate({ where: { importId: exists.id }, _max: { position: true } });
  const firstPosition = (lastImage._max.position ?? -1) + 1;
  const uploadedImages = await uploadFiles(images, "imports/images");
  try {
    await db.vehicleImportImage.createMany({ data: uploadedImages.map((image, index) => ({ importId: exists.id, filename: image.filename, mimeType: image.mimeType, storageKey: image.storageKey, position: firstPosition + index })) });
  } catch (error) {
    await deleteObjectsBestEffort(uploadedImages.map((image) => image.storageKey));
    throw error;
  }
  await audit(user.id, "ADD_IMAGES", exists.id, { count: images.length, zipFilename: zipFile.name });
  revalidatePath(`/admin/imports/${exists.id}`);
  revalidatePath(`/imports/${exists.id}`);
  redirect(`/admin/imports/${exists.id}?ok=images`);
}

export async function deleteVehicleImportImageAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = z.object({ importId: z.string().min(1), imageId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/imports");
  const image = await db.vehicleImportImage.findFirst({ where: { id: parsed.data.imageId, importId: parsed.data.importId }, select: { id: true, importId: true, filename: true, storageKey: true } });
  if (!image) redirect(`/admin/imports/${parsed.data.importId}?error=image`);
  await db.vehicleImportImage.delete({ where: { id: image.id } });
  await deleteObjectsBestEffort([image.storageKey]);
  await audit(user.id, "DELETE_IMAGE", image.importId, { imageId: image.id, filename: image.filename });
  revalidatePath(`/admin/imports/${image.importId}`);
  revalidatePath(`/imports/${image.importId}`);
  redirect(`/admin/imports/${image.importId}?ok=image-deleted`);
}

export async function addVehicleImportAttachmentsAction(formData: FormData) {
  const user = await requireStaff();
  const importId = z.string().min(1).safeParse(formData.get("importId"));
  if (!importId.success) redirect("/admin/imports");
  const exists = await db.vehicleImport.findUnique({ where: { id: importId.data }, select: { id: true } });
  if (!exists) redirect("/admin/imports");
  const files = formData.getAll("attachments").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length || files.length > 5 || files.some((file) => file.size > 5 * 1024 * 1024 || !allowedAttachmentTypes.has(file.type)) || files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) redirect(`/admin/imports/${exists.id}?error=attachments`);
  const attachments = await Promise.all(files.map(async (file) => ({ filename: file.name.slice(0, 180), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) })));
  const uploadedAttachments = await uploadFiles(attachments, "imports/attachments");
  try {
    await db.vehicleImportAttachment.createMany({ data: uploadedAttachments.map((attachment) => ({ importId: exists.id, filename: attachment.filename, mimeType: attachment.mimeType, size: attachment.size ?? attachment.data.length, storageKey: attachment.storageKey })) });
  } catch (error) {
    await deleteObjectsBestEffort(uploadedAttachments.map((file) => file.storageKey));
    throw error;
  }
  await audit(user.id, "ADD_ATTACHMENTS", exists.id, { count: attachments.length, filenames: attachments.map((file) => file.filename) });
  revalidatePath(`/admin/imports/${exists.id}`);
  revalidatePath(`/imports/${exists.id}`);
  redirect(`/admin/imports/${exists.id}?ok=attachments`);
}

export async function deleteVehicleImportAttachmentAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = z.object({ importId: z.string().min(1), attachmentId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/imports");
  const attachment = await db.vehicleImportAttachment.findFirst({ where: { id: parsed.data.attachmentId, importId: parsed.data.importId }, select: { id: true, importId: true, filename: true, storageKey: true } });
  if (!attachment) redirect(`/admin/imports/${parsed.data.importId}?error=attachment`);
  await db.vehicleImportAttachment.delete({ where: { id: attachment.id } });
  await deleteObjectsBestEffort([attachment.storageKey]);
  await audit(user.id, "DELETE_ATTACHMENT", attachment.importId, { attachmentId: attachment.id, filename: attachment.filename });
  revalidatePath(`/admin/imports/${attachment.importId}`);
  revalidatePath(`/imports/${attachment.importId}`);
  redirect(`/admin/imports/${attachment.importId}?ok=attachment-deleted`);
}

export async function updateVehicleImportStatusAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = z.object({ id: z.string().min(1), status: importStatusSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/imports?error=status");
  const row = await db.vehicleImport.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  await audit(user.id, "STATUS_CHANGE", row.id, { status: row.status });
  revalidatePath("/admin/imports");
  revalidatePath(`/admin/imports/${row.id}`);
  revalidatePath("/imports");
  revalidatePath(`/imports/${row.id}`);
  redirect(`/admin/imports/${row.id}?ok=status`);
}

export async function deleteVehicleImportAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = z.object({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/imports?error=delete-invalid");

  const item = await db.vehicleImport.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      referenceCode: true,
      importType: true,
      vin: true,
      images: { select: { storageKey: true } },
      attachments: { select: { storageKey: true } },
    },
  });
  if (!item) redirect("/admin/imports?error=delete-not-found");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0];

  try {
    await db.$transaction(async (tx) => {
      await tx.vehicleImport.delete({ where: { id: item.id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          entity: "VehicleImport",
          entityId: item.id,
          details: JSON.stringify({ referenceCode: item.referenceCode, importType: item.importType, vin: item.vin }),
          ip,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      redirect("/admin/imports?error=delete-not-found");
    }
    redirect("/admin/imports?error=delete-failed");
  }

  await deleteObjectsBestEffort([
    ...item.images.map((image) => image.storageKey),
    ...item.attachments.map((attachment) => attachment.storageKey),
  ]);
  revalidatePath("/admin/imports");
  revalidatePath(`/admin/imports/${item.id}`);
  revalidatePath("/imports");
  revalidatePath(`/imports/${item.id}`);
  redirect("/admin/imports?ok=deleted");
}

export async function addVehicleImportNoteAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = z.object({ id: z.string().min(1), body: z.string().trim().min(2).max(2000), visibleToCustomer: z.string().optional().transform((value) => value === "on") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/imports/${encodeURIComponent(String(formData.get("id") ?? ""))}?error=note`);
  const exists = await db.vehicleImport.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
  if (!exists) redirect("/admin/imports");
  const note = await db.vehicleImportNote.create({ data: { importId: exists.id, authorId: user.id, body: parsed.data.body, visibleToCustomer: parsed.data.visibleToCustomer } });
  await audit(user.id, "ADD_NOTE", exists.id, { noteId: note.id, visibleToCustomer: note.visibleToCustomer });
  revalidatePath(`/admin/imports/${exists.id}`);
  revalidatePath(`/imports/${exists.id}`);
  redirect(`/admin/imports/${exists.id}?ok=note`);
}
