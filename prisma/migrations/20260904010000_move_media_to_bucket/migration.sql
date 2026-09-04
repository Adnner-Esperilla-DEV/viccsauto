ALTER TABLE "ProductImage"
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'image/webp';

ALTER TABLE "VehicleImage"
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'image/webp';

ALTER TABLE "VehicleImportImage"
ADD COLUMN "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;

ALTER TABLE "VehicleImportAttachment"
ADD COLUMN "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;

CREATE UNIQUE INDEX "ProductImage_storageKey_key" ON "ProductImage"("storageKey");
CREATE UNIQUE INDEX "VehicleImage_storageKey_key" ON "VehicleImage"("storageKey");
CREATE UNIQUE INDEX "VehicleImportImage_storageKey_key" ON "VehicleImportImage"("storageKey");
CREATE UNIQUE INDEX "VehicleImportAttachment_storageKey_key" ON "VehicleImportAttachment"("storageKey");
