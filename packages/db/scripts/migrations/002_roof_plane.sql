CREATE TYPE "RoofSheetType" AS ENUM ('LONG_SPAN_ALUMINIUM', 'CORRUGATED_STANDARD');

CREATE TABLE "RoofPlane" (
    "id" TEXT NOT NULL,
    "takeoffModelId" TEXT NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "sheetType" "RoofSheetType" NOT NULL,
    "sheetLengthM" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "RoofPlane_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoofPlane_takeoffModelId_idx" ON "RoofPlane"("takeoffModelId");

ALTER TABLE "RoofPlane" ADD CONSTRAINT "RoofPlane_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
