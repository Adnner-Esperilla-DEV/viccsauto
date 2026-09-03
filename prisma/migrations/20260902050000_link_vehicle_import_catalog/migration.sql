-- Store catalog relations in addition to the historical make/model names.
ALTER TABLE "VehicleImport" ADD COLUMN "makeId" TEXT;
ALTER TABLE "VehicleImport" ADD COLUMN "modelId" TEXT;

-- Link existing imports when their saved names match the current catalog.
UPDATE "VehicleImport" AS imported
SET "makeId" = catalog."id"
FROM "VehicleMake" AS catalog
WHERE LOWER(TRIM(imported."make")) = LOWER(TRIM(catalog."name"));

UPDATE "VehicleImport" AS imported
SET "modelId" = catalog."id"
FROM "VehicleModel" AS catalog
WHERE catalog."makeId" = imported."makeId"
  AND LOWER(TRIM(imported."model")) = LOWER(TRIM(catalog."name"));

CREATE INDEX "VehicleImport_makeId_idx" ON "VehicleImport"("makeId");
CREATE INDEX "VehicleImport_modelId_idx" ON "VehicleImport"("modelId");

ALTER TABLE "VehicleImport" ADD CONSTRAINT "VehicleImport_makeId_fkey"
FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VehicleImport" ADD CONSTRAINT "VehicleImport_modelId_fkey"
FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
