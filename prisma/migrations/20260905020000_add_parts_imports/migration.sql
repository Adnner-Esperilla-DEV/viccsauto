ALTER TABLE "VehicleImport"
ADD COLUMN "importType" TEXT NOT NULL DEFAULT 'VEHICLE',
ADD COLUMN "referenceCode" TEXT,
ADD COLUMN "shippingCostUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "logisticsServiceUsd" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "VehicleImport"
SET "referenceCode" = 'IMP-' || EXTRACT(YEAR FROM "createdAt")::TEXT || '-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8));

ALTER TABLE "VehicleImport"
ALTER COLUMN "referenceCode" SET NOT NULL,
ALTER COLUMN "vin" DROP NOT NULL,
ALTER COLUMN "year" DROP NOT NULL,
ALTER COLUMN "make" DROP NOT NULL,
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "color" DROP NOT NULL;

CREATE UNIQUE INDEX "VehicleImport_referenceCode_key" ON "VehicleImport"("referenceCode");
CREATE INDEX "VehicleImport_importType_updatedAt_idx" ON "VehicleImport"("importType", "updatedAt");

CREATE TABLE "ImportedPart" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partBrand" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitValueUsd" DECIMAL(12,2) NOT NULL,
    "weightKg" DECIMAL(10,2),
    "makeId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER NOT NULL,
    "engine" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportedPart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportedPart_importId_position_idx" ON "ImportedPart"("importId", "position");
CREATE INDEX "ImportedPart_partNumber_idx" ON "ImportedPart"("partNumber");
CREATE INDEX "ImportedPart_makeId_modelId_yearFrom_yearTo_idx" ON "ImportedPart"("makeId", "modelId", "yearFrom", "yearTo");

ALTER TABLE "ImportedPart" ADD CONSTRAINT "ImportedPart_importId_fkey" FOREIGN KEY ("importId") REFERENCES "VehicleImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedPart" ADD CONSTRAINT "ImportedPart_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportedPart" ADD CONSTRAINT "ImportedPart_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
