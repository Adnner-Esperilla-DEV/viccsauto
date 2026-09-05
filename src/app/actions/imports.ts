"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObjectsBestEffort, uploadObject } from "@/lib/object-storage";
import { extractImagesFromZip } from "@/lib/zip-images";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const optionalNumber = z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().nonnegative().optional());
const usdAmount = z.preprocess(
  (value) => value === "" || value == null ? 0 : value,
  z.coerce.number().finite().nonnegative().max(9_999_999_999.99),
);
const importStatusSchema = z.enum(["INCOMING", "RECEIVED", "ASSIGNED", "LOADED", "SHIPPED"]);
const allowedAttachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const vehicleImportDataSchema = z.object({
  customerId: z.string().min(1),
  vin: z.string().trim().min(11).max(25).transform((value) => value.toUpperCase()),
  year: z.coerce.number().int().min(1900).max(2100),
  makeId: z.string().min(1),
  modelId: z.string().min(1),
  color: z.string().trim().min(2).max(60).transform((value) => value.toUpperCase()),
  lotNumber: optionalText(60),
  weightKg: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().int().positive().max(100_000).optional()),
  valueUsd: optionalNumber,
  towingCostUsd: usdAmount,
  oceanFreightUsd: usdAmount,
  paidAmountUsd: usdAmount,
  loadType: optionalText(30),
  destinationPort: optionalText(160),
  receivedDate: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.date().optional()),
  hazmat: z.enum(["yes", "no"]).transform((value) => value === "yes"),
  fuel: optionalText(50),
  keyStatus: z.enum(["NO_KEY", "UNKNOWN", "KEY_PRESENT"]),
  titleStatus: z.enum(["NO_TITLE", "PENDING", "RECEIVED"]),
  titleNumber: optionalText(80),
  titleState: optionalText(20),
  scheduleB: optionalText(80),
  customerParty: optionalText(160),
  shipper: optionalText(160),
  consignee: optionalText(160),
  notifyParty: optionalText(160),
  exportReference: optionalText(160),
  status: importStatusSchema,
}).superRefine((value, context) => {
  const totalCents = Math.round((value.towingCostUsd + value.oceanFreightUsd) * 100);
  const paidCents = Math.round(value.paidAmountUsd * 100);
  if (paidCents > totalCents) {
    context.addIssue({ code: "custom", path: ["paidAmountUsd"], message: "El monto cancelado no puede superar el total de la importación." });
  }
});

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

export async function createVehicleImportAction(formData: FormData) {
  const user = await requireStaff();
  const noteResult = z.preprocess((value) => value === "" || value == null ? undefined : value, z.string().trim().max(2000).optional()).safeParse(formData.get("initialNote"));
  if (!noteResult.success) importError("invalid");
  const initialNote = noteResult.data;
  const parsed = vehicleImportDataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) importError(parsed.error.issues.some((issue) => issue.path[0] === "paidAmountUsd") ? "payment" : "invalid");

  const [customer, selectedVehicleModel] = await Promise.all([
    db.user.findFirst({ where: { id: parsed.data.customerId, role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } }, select: { id: true } }),
    db.vehicleModel.findFirst({ where: { id: parsed.data.modelId, makeId: parsed.data.makeId, isActive: true, make: { isActive: true } }, select: { name: true, make: { select: { name: true } } } }),
  ]);
  if (!customer) importError("customer");
  if (!selectedVehicleModel) importError("invalid");

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
    const vehicleData = parsed.data;
    vehicleImport = await db.$transaction(async (tx) => {
      const row = await tx.vehicleImport.create({ data: { ...vehicleData, make: selectedVehicleModel.make.name, model: selectedVehicleModel.name, valueUsd: vehicleData.valueUsd ?? null } });
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

  await audit(user.id, "CREATE", vehicleImport.id, { vin: vehicleImport.vin, customerId: customer.id, towingCostUsd: vehicleImport.towingCostUsd, oceanFreightUsd: vehicleImport.oceanFreightUsd, paidAmountUsd: vehicleImport.paidAmountUsd, imageCount: images.length, attachmentCount: attachments.length, initialCustomerNote: Boolean(initialNote) });
  revalidatePath("/admin/imports");
  revalidatePath("/imports");
  redirect(`/admin/imports/${vehicleImport.id}?ok=created`);
}

export async function updateVehicleImportAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = vehicleImportDataSchema.safeExtend({ id: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  const fallbackId = encodeURIComponent(String(formData.get("id") ?? ""));
  if (!parsed.success) {
    const errorCode = parsed.error.issues.some((issue) => issue.path[0] === "paidAmountUsd") ? "payment" : "invalid";
    redirect(`/admin/imports/${fallbackId}/edit?error=${errorCode}`);
  }
  const data = parsed.data;
  const [existing, customer, selectedVehicleModel] = await Promise.all([
    db.vehicleImport.findUnique({ where: { id: data.id }, select: { id: true, customerId: true } }),
    db.user.findFirst({ where: { id: data.customerId, role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } }, select: { id: true } }),
    db.vehicleModel.findFirst({ where: { id: data.modelId, makeId: data.makeId, isActive: true, make: { isActive: true } }, select: { name: true, make: { select: { name: true } } } }),
  ]);
  if (!existing) redirect("/admin/imports");
  if (!customer) redirect(`/admin/imports/${data.id}/edit?error=customer`);
  if (!selectedVehicleModel) redirect(`/admin/imports/${data.id}/edit?error=invalid`);
  const { id, ...fields } = data;
  try {
    await db.vehicleImport.update({ where: { id }, data: {
      ...fields,
      make: selectedVehicleModel.make.name,
      model: selectedVehicleModel.name,
      lotNumber: fields.lotNumber ?? null,
      weightKg: fields.weightKg ?? null,
      valueUsd: fields.valueUsd ?? null,
      loadType: fields.loadType ?? null,
      destinationPort: fields.destinationPort ?? null,
      receivedDate: fields.receivedDate ?? null,
      fuel: fields.fuel ?? null,
      titleNumber: fields.titleNumber ?? null,
      titleState: fields.titleState ?? null,
      scheduleB: fields.scheduleB ?? null,
      customerParty: fields.customerParty ?? null,
      shipper: fields.shipper ?? null,
      consignee: fields.consignee ?? null,
      notifyParty: fields.notifyParty ?? null,
      exportReference: fields.exportReference ?? null,
    } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect(`/admin/imports/${id}/edit?error=duplicate`);
    throw error;
  }
  await audit(user.id, "UPDATE", id, { previousCustomerId: existing.customerId, customerId: customer.id, makeId: fields.makeId, modelId: fields.modelId, towingCostUsd: fields.towingCostUsd, oceanFreightUsd: fields.oceanFreightUsd, paidAmountUsd: fields.paidAmountUsd });
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
