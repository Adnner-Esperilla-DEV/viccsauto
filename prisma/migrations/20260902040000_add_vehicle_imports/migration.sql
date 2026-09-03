-- CreateTable
CREATE TABLE "VehicleImport" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "lotNumber" TEXT,
    "weightKg" INTEGER,
    "valueUsd" DECIMAL(12,2),
    "loadType" TEXT,
    "destinationPort" TEXT,
    "receivedDate" TIMESTAMP(3),
    "hazmat" BOOLEAN NOT NULL DEFAULT false,
    "fuel" TEXT,
    "keyStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "titleStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "titleNumber" TEXT,
    "titleState" TEXT,
    "scheduleB" TEXT,
    "customerParty" TEXT,
    "shipper" TEXT,
    "consignee" TEXT,
    "notifyParty" TEXT,
    "exportReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleImportImage" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VehicleImportImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleImportAttachment" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleImportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleImportNote" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleImportNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleImport_vin_key" ON "VehicleImport"("vin");
CREATE INDEX "VehicleImport_customerId_updatedAt_idx" ON "VehicleImport"("customerId", "updatedAt");
CREATE INDEX "VehicleImport_status_updatedAt_idx" ON "VehicleImport"("status", "updatedAt");
CREATE INDEX "VehicleImport_lotNumber_idx" ON "VehicleImport"("lotNumber");
CREATE INDEX "VehicleImportImage_importId_position_idx" ON "VehicleImportImage"("importId", "position");
CREATE INDEX "VehicleImportAttachment_importId_createdAt_idx" ON "VehicleImportAttachment"("importId", "createdAt");
CREATE INDEX "VehicleImportNote_importId_createdAt_idx" ON "VehicleImportNote"("importId", "createdAt");

ALTER TABLE "VehicleImport" ADD CONSTRAINT "VehicleImport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleImportImage" ADD CONSTRAINT "VehicleImportImage_importId_fkey" FOREIGN KEY ("importId") REFERENCES "VehicleImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleImportAttachment" ADD CONSTRAINT "VehicleImportAttachment_importId_fkey" FOREIGN KEY ("importId") REFERENCES "VehicleImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleImportNote" ADD CONSTRAINT "VehicleImportNote_importId_fkey" FOREIGN KEY ("importId") REFERENCES "VehicleImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleImportNote" ADD CONSTRAINT "VehicleImportNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
