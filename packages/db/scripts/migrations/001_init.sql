-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TakeoffStatus" AS ENUM ('DRAFT', 'REVIEWED', 'LOCKED');

-- CreateEnum
CREATE TYPE "TakeoffInputMethod" AS ENUM ('MANUAL', 'PDF_EXTRACTED', 'HYBRID');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('WET', 'DRY');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('BLOCK_225MM', 'BLOCK_150MM');

-- CreateEnum
CREATE TYPE "OpeningType" AS ENUM ('DOOR', 'WINDOW');

-- CreateEnum
CREATE TYPE "StructuralStage" AS ENUM ('SUBSTRUCTURE', 'SUPERSTRUCTURE');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'NEEDS_REVIEW', 'REVIEWED', 'FAILED');

-- CreateEnum
CREATE TYPE "PriceSourceType" AS ENUM ('MARKETPLACE', 'SUPPLIER_SITE', 'NEWS_AGGREGATOR', 'MANUAL_ADMIN_ENTRY');

-- CreateEnum
CREATE TYPE "PriceTier" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "BOQSnapshotStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "BOQLineRateSourceType" AS ENUM ('PRICE_RECORD', 'USER_OVERRIDE', 'MISSING');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TakeoffModel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "inputMethod" "TakeoffInputMethod" NOT NULL,
    "status" "TakeoffStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakeoffModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "takeoffModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floorHeightM" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "roomType" "RoomType" NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wall" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "roomAId" TEXT,
    "roomBId" TEXT,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "heightM" DOUBLE PRECISION NOT NULL,
    "thicknessMm" INTEGER NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "mortarRatioCement" INTEGER NOT NULL DEFAULT 1,
    "mortarRatioSand" INTEGER NOT NULL DEFAULT 6,
    "startPointX" DOUBLE PRECISION,
    "startPointY" DOUBLE PRECISION,
    "endPointX" DOUBLE PRECISION,
    "endPointY" DOUBLE PRECISION,

    CONSTRAINT "Wall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opening" (
    "id" TEXT NOT NULL,
    "wallId" TEXT NOT NULL,
    "type" "OpeningType" NOT NULL,
    "widthM" DOUBLE PRECISION NOT NULL,
    "heightM" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Opening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StructuralElement" (
    "id" TEXT NOT NULL,
    "takeoffModelId" TEXT NOT NULL,
    "stage" "StructuralStage" NOT NULL,
    "description" TEXT NOT NULL,
    "volumeM3" DOUBLE PRECISION NOT NULL,
    "mixRatioCement" INTEGER NOT NULL,
    "mixRatioSand" INTEGER NOT NULL,
    "mixRatioGranite" INTEGER,

    CONSTRAINT "StructuralElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebarSchedule" (
    "id" TEXT NOT NULL,
    "structuralElementId" TEXT NOT NULL,
    "diameterMm" DOUBLE PRECISION NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RebarSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorPlanUpload" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloorPlanUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL,
    "floorPlanUploadId" TEXT NOT NULL,
    "takeoffModelId" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "aiModelUsed" TEXT NOT NULL,
    "rawAiOutput" JSONB,
    "scaleCalibration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionReviewLog" (
    "id" TEXT NOT NULL,
    "extractionJobId" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "originalValue" JSONB,
    "correctedValue" JSONB,
    "reviewedById" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEngineVersion" (
    "id" TEXT NOT NULL,
    "versionTag" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changelog" TEXT,

    CONSTRAINT "RuleEngineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCanonical" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "aliases" TEXT[],

    CONSTRAINT "MaterialCanonical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "type" "PriceSourceType" NOT NULL,
    "tier" "PriceTier" NOT NULL,
    "scrapeConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PriceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "priceSourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "recordsFound" INTEGER NOT NULL DEFAULT 0,
    "recordsMatched" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL,
    "materialCanonicalId" TEXT NOT NULL,
    "priceSourceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "unit" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "sourceUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "confidenceTier" "PriceTier" NOT NULL,
    "isOutlier" BOOLEAN NOT NULL DEFAULT false,
    "rawListingText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRateOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "materialCanonicalId" TEXT NOT NULL,
    "projectId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "region" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabourRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "takeoffModelId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "BOQSnapshotStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "ruleEngineVersionId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',

    CONSTRAINT "BOQSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQLineItem" (
    "id" TEXT NOT NULL,
    "boqSnapshotId" TEXT NOT NULL,
    "materialCanonicalId" TEXT,
    "stage" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitRate" DOUBLE PRECISION,
    "unitRateSourceType" "BOQLineRateSourceType" NOT NULL,
    "unitRateSourceId" TEXT,
    "provenanceLabel" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "traceabilityRefs" JSONB NOT NULL,

    CONSTRAINT "BOQLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "TakeoffModel_projectId_idx" ON "TakeoffModel"("projectId");

-- CreateIndex
CREATE INDEX "Level_takeoffModelId_idx" ON "Level"("takeoffModelId");

-- CreateIndex
CREATE INDEX "Room_levelId_idx" ON "Room"("levelId");

-- CreateIndex
CREATE INDEX "Wall_levelId_idx" ON "Wall"("levelId");

-- CreateIndex
CREATE INDEX "Opening_wallId_idx" ON "Opening"("wallId");

-- CreateIndex
CREATE INDEX "StructuralElement_takeoffModelId_idx" ON "StructuralElement"("takeoffModelId");

-- CreateIndex
CREATE INDEX "RebarSchedule_structuralElementId_idx" ON "RebarSchedule"("structuralElementId");

-- CreateIndex
CREATE INDEX "FloorPlanUpload_projectId_idx" ON "FloorPlanUpload"("projectId");

-- CreateIndex
CREATE INDEX "ExtractionJob_floorPlanUploadId_idx" ON "ExtractionJob"("floorPlanUploadId");

-- CreateIndex
CREATE INDEX "ExtractionReviewLog_extractionJobId_idx" ON "ExtractionReviewLog"("extractionJobId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleEngineVersion_versionTag_key" ON "RuleEngineVersion"("versionTag");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCanonical_code_key" ON "MaterialCanonical"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSource_name_key" ON "PriceSource"("name");

-- CreateIndex
CREATE INDEX "ScrapeRun_priceSourceId_idx" ON "ScrapeRun"("priceSourceId");

-- CreateIndex
CREATE INDEX "PriceRecord_materialCanonicalId_region_idx" ON "PriceRecord"("materialCanonicalId", "region");

-- CreateIndex
CREATE INDEX "PriceRecord_priceSourceId_idx" ON "PriceRecord"("priceSourceId");

-- CreateIndex
CREATE INDEX "UserRateOverride_userId_materialCanonicalId_idx" ON "UserRateOverride"("userId", "materialCanonicalId");

-- CreateIndex
CREATE INDEX "UserRateOverride_projectId_materialCanonicalId_idx" ON "UserRateOverride"("projectId", "materialCanonicalId");

-- CreateIndex
CREATE INDEX "LabourRate_organizationId_trade_region_idx" ON "LabourRate"("organizationId", "trade", "region");

-- CreateIndex
CREATE INDEX "BOQSnapshot_projectId_idx" ON "BOQSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "BOQLineItem_boqSnapshotId_idx" ON "BOQLineItem"("boqSnapshotId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeoffModel" ADD CONSTRAINT "TakeoffModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wall" ADD CONSTRAINT "Wall_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wall" ADD CONSTRAINT "Wall_roomAId_fkey" FOREIGN KEY ("roomAId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wall" ADD CONSTRAINT "Wall_roomBId_fkey" FOREIGN KEY ("roomBId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opening" ADD CONSTRAINT "Opening_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructuralElement" ADD CONSTRAINT "StructuralElement_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarSchedule" ADD CONSTRAINT "RebarSchedule_structuralElementId_fkey" FOREIGN KEY ("structuralElementId") REFERENCES "StructuralElement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorPlanUpload" ADD CONSTRAINT "FloorPlanUpload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionJob" ADD CONSTRAINT "ExtractionJob_floorPlanUploadId_fkey" FOREIGN KEY ("floorPlanUploadId") REFERENCES "FloorPlanUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionJob" ADD CONSTRAINT "ExtractionJob_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionReviewLog" ADD CONSTRAINT "ExtractionReviewLog_extractionJobId_fkey" FOREIGN KEY ("extractionJobId") REFERENCES "ExtractionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionReviewLog" ADD CONSTRAINT "ExtractionReviewLog_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_priceSourceId_fkey" FOREIGN KEY ("priceSourceId") REFERENCES "PriceSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_materialCanonicalId_fkey" FOREIGN KEY ("materialCanonicalId") REFERENCES "MaterialCanonical"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_priceSourceId_fkey" FOREIGN KEY ("priceSourceId") REFERENCES "PriceSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRateOverride" ADD CONSTRAINT "UserRateOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRateOverride" ADD CONSTRAINT "UserRateOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRateOverride" ADD CONSTRAINT "UserRateOverride_materialCanonicalId_fkey" FOREIGN KEY ("materialCanonicalId") REFERENCES "MaterialCanonical"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRateOverride" ADD CONSTRAINT "UserRateOverride_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabourRate" ADD CONSTRAINT "LabourRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQSnapshot" ADD CONSTRAINT "BOQSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQSnapshot" ADD CONSTRAINT "BOQSnapshot_takeoffModelId_fkey" FOREIGN KEY ("takeoffModelId") REFERENCES "TakeoffModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQSnapshot" ADD CONSTRAINT "BOQSnapshot_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQSnapshot" ADD CONSTRAINT "BOQSnapshot_ruleEngineVersionId_fkey" FOREIGN KEY ("ruleEngineVersionId") REFERENCES "RuleEngineVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLineItem" ADD CONSTRAINT "BOQLineItem_boqSnapshotId_fkey" FOREIGN KEY ("boqSnapshotId") REFERENCES "BOQSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQLineItem" ADD CONSTRAINT "BOQLineItem_materialCanonicalId_fkey" FOREIGN KEY ("materialCanonicalId") REFERENCES "MaterialCanonical"("id") ON DELETE SET NULL ON UPDATE CASCADE;

