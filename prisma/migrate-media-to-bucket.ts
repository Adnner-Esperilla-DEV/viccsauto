import { PrismaClient } from "@prisma/client";
import { decodeDataImage, deleteObjectsBestEffort, uploadObject } from "../src/lib/object-storage";

const prisma = new PrismaClient();

async function persistUpload<T>(storageKey: string, save: () => Promise<T>) {
  try {
    return await save();
  } catch (error) {
    await deleteObjectsBestEffort([storageKey]);
    throw error;
  }
}

async function migrateProductImages() {
  const rows = await prisma.productImage.findMany({ where: { storageKey: null } });
  let migrated = 0;
  for (const row of rows) {
    if (!row.url.startsWith("data:")) continue;
    const image = decodeDataImage(row.url);
    const storageKey = await uploadObject({ ...image, prefix: "products" });
    await persistUpload(storageKey, () => prisma.productImage.update({
      where: { id: row.id },
      data: { mimeType: image.contentType, storageKey, url: `bucket:${storageKey}` },
    }));
    migrated += 1;
  }
  return migrated;
}

async function migrateVehicleImages() {
  const rows = await prisma.vehicleImage.findMany({ where: { storageKey: null } });
  let migrated = 0;
  for (const row of rows) {
    if (!row.url.startsWith("data:")) continue;
    const image = decodeDataImage(row.url);
    const storageKey = await uploadObject({ ...image, prefix: "vehicles" });
    await persistUpload(storageKey, () => prisma.vehicleImage.update({
      where: { id: row.id },
      data: { mimeType: image.contentType, storageKey, url: `bucket:${storageKey}` },
    }));
    migrated += 1;
  }
  return migrated;
}

async function migrateImportImages() {
  const rows = await prisma.vehicleImportImage.findMany({ where: { storageKey: null, data: { not: null } } });
  for (const row of rows) {
    if (!row.data) continue;
    const storageKey = await uploadObject({ body: new Uint8Array(row.data), contentType: row.mimeType, filename: row.filename, prefix: "imports/images" });
    await persistUpload(storageKey, () => prisma.vehicleImportImage.update({ where: { id: row.id }, data: { data: null, storageKey } }));
  }
  return rows.length;
}

async function migrateImportAttachments() {
  const rows = await prisma.vehicleImportAttachment.findMany({ where: { storageKey: null, data: { not: null } } });
  for (const row of rows) {
    if (!row.data) continue;
    const storageKey = await uploadObject({ body: new Uint8Array(row.data), contentType: row.mimeType, filename: row.filename, prefix: "imports/attachments" });
    await persistUpload(storageKey, () => prisma.vehicleImportAttachment.update({ where: { id: row.id }, data: { data: null, storageKey } }));
  }
  return rows.length;
}

async function main() {
  const products = await migrateProductImages();
  const vehicles = await migrateVehicleImages();
  const importImages = await migrateImportImages();
  const attachments = await migrateImportAttachments();
  console.log(`Migración de medios completada: ${products} productos, ${vehicles} vehículos, ${importImages} imágenes de importación y ${attachments} adjuntos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
