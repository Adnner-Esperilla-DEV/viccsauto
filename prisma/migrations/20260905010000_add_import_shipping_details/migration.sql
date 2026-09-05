ALTER TABLE "VehicleImport"
ADD COLUMN "containerNumber" TEXT,
ADD COLUMN "shippingLine" TEXT,
ADD COLUMN "departureDate" TIMESTAMP(3),
ADD COLUMN "arrivalDate" TIMESTAMP(3),
ADD COLUMN "arrivalPlace" TEXT DEFAULT 'Iquique, Chile';
