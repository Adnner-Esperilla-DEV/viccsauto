/*
  Warnings:

  - Made the column `vehicleModelId` on table `ProductCompatibility` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ProductCompatibility_make_model_yearFrom_yearTo_idx";

-- AlterTable
ALTER TABLE "ProductCompatibility" ALTER COLUMN "make" DROP NOT NULL,
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "vehicleModelId" SET NOT NULL;
