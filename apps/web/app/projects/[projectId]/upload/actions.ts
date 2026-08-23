"use server";

import { redirect } from "next/navigation";
import { prisma } from "@konstria/db";
import { requireProjectAccess } from "../../../../lib/requireProjectAccess.js";
import { getOrCreateTakeoffModel } from "../../../../lib/getOrCreateTakeoffModel.js";
import { uploadPlanImage } from "../../../../lib/blob/uploadPlan.js";
import { extractPlan } from "../../../../lib/extraction/openaiExtract.js";
import { STANDARD_OPENING_HEIGHT_M } from "@konstria/rules-engine";

export interface ExtractionDraftWall {
  tempId: string;
  lengthM: number;
}

export interface ExtractionDraftRoom {
  tempId: string;
  text: string;
  areaM2: number;
}

export interface ExtractionDraftOpening {
  tempId: string;
  wallTempId: string;
  type: "DOOR" | "WINDOW";
  widthM: number;
  suggestedHeightM: number;
}

export interface ExtractionDraft {
  extractionJobId: string;
  pxPerMetre: number;
  walls: ExtractionDraftWall[];
  roomLabels: ExtractionDraftRoom[];
  openings: ExtractionDraftOpening[];
  dimensionTexts: string[];
  extractionNotes: string;
}

/**
 * Uploads the plan image, runs the real OpenAI vision extraction, and
 * returns a draft for the review screen. Nothing here becomes part of the
 * takeoff yet — that only happens once the user reviews and confirms via
 * commitExtraction. Wall lengths, room areas, and opening widths are all
 * derived from the user's own scale calibration (two clicked points + a real
 * distance they typed) applied to the AI's pixel geometry, never from the
 * AI's own guess at real-world units. Opening height is never on a plan
 * view (a 2D floor plan has no vertical dimension), so it stays a documented
 * default (STANDARD_OPENING_HEIGHT_M) the reviewer must confirm or correct.
 */
export async function extractFromUpload(projectId: string, formData: FormData): Promise<ExtractionDraft> {
  await requireProjectAccess(projectId);

  const file = formData.get("file") as File;
  const pointAX = Number(formData.get("pointAX"));
  const pointAY = Number(formData.get("pointAY"));
  const pointBX = Number(formData.get("pointBX"));
  const pointBY = Number(formData.get("pointBY"));
  const realWorldLengthM = Number(formData.get("realWorldLengthM"));

  if (!file || !(realWorldLengthM > 0)) {
    throw new Error("A plan image and a positive calibration distance are required");
  }

  const pxPerMetre = Math.hypot(pointBX - pointAX, pointBY - pointAY) / realWorldLengthM;
  if (!(pxPerMetre > 0) || !Number.isFinite(pxPerMetre)) {
    throw new Error("Invalid scale calibration. The two points must be different and the distance positive");
  }

  const arrayBuffer = await file.arrayBuffer();
  const dataUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString("base64")}`;

  const fileUrl = await uploadPlanImage(projectId, file);
  const floorPlanUpload = await prisma.floorPlanUpload.create({
    data: { projectId, fileUrl, fileType: file.type },
  });

  const extraction = await extractPlan(dataUrl);

  const extractionJob = await prisma.extractionJob.create({
    data: {
      floorPlanUploadId: floorPlanUpload.id,
      status: "NEEDS_REVIEW",
      aiModelUsed: "gpt-4o-2024-08-06",
      rawAiOutput: extraction,
      scaleCalibration: {
        pointAPx: [pointAX, pointAY],
        pointBPx: [pointBX, pointBY],
        realWorldLengthM,
      },
    },
  });

  return {
    extractionJobId: extractionJob.id,
    pxPerMetre,
    walls: extraction.walls.map((w) => ({
      tempId: w.tempId,
      lengthM: Number(
        (Math.hypot(w.endXPx - w.startXPx, w.endYPx - w.startYPx) / pxPerMetre).toFixed(2)
      ),
    })),
    roomLabels: extraction.roomLabels.map((r) => {
      const widthPx = Math.abs(r.bottomRightXPx - r.topLeftXPx);
      const depthPx = Math.abs(r.bottomRightYPx - r.topLeftYPx);
      const areaM2 = (widthPx / pxPerMetre) * (depthPx / pxPerMetre);
      return {
        tempId: r.tempId,
        text: r.text,
        areaM2: Number.isFinite(areaM2) ? Number(areaM2.toFixed(1)) : 0,
      };
    }),
    openings: extraction.openings.map((o) => {
      const widthM = Math.hypot(o.endXPx - o.startXPx, o.endYPx - o.startYPx) / pxPerMetre;
      return {
        tempId: o.tempId,
        wallTempId: o.wallTempId,
        type: o.type,
        widthM: Number.isFinite(widthM) ? Number(widthM.toFixed(2)) : 0,
        suggestedHeightM: STANDARD_OPENING_HEIGHT_M[o.type],
      };
    }),
    dimensionTexts: extraction.dimensionTexts.map((d) => d.text),
    extractionNotes: extraction.extractionNotes,
  };
}

export interface ReviewedWall {
  tempId: string;
  lengthM: number;
  heightM: number;
  blockType: "BLOCK_225MM" | "BLOCK_150MM";
}

export interface ReviewedRoom {
  name: string;
  areaM2: number;
  roomType: "WET" | "DRY";
}

export interface ReviewedOpening {
  wallTempId: string;
  type: "DOOR" | "WINDOW";
  widthM: number;
  heightM: number;
  quantity: number;
}

/**
 * Materializes the user-reviewed (and possibly corrected) extraction into
 * real Level/Wall/Room/Opening rows on the project's takeoff model, then
 * marks the takeoff REVIEWED — this is the same status gate manual entry
 * uses, so BOQ generation treats both input paths identically from here on.
 */
export async function commitExtraction(
  projectId: string,
  extractionJobId: string,
  levelName: string,
  floorHeightM: number,
  walls: ReviewedWall[],
  rooms: ReviewedRoom[],
  openings: ReviewedOpening[]
) {
  const { user } = await requireProjectAccess(projectId);
  const takeoff = await getOrCreateTakeoffModel(projectId);

  const hadExistingLevels = (await prisma.level.count({ where: { takeoffModelId: takeoff.id } })) > 0;

  const level = await prisma.level.create({
    data: {
      takeoffModelId: takeoff.id,
      name: levelName,
      floorHeightM,
      order: await prisma.level.count({ where: { takeoffModelId: takeoff.id } }),
    },
  });

  const wallIdByTempId = new Map<string, string>();
  for (const wall of walls) {
    const created = await prisma.wall.create({
      data: {
        levelId: level.id,
        lengthM: wall.lengthM,
        heightM: wall.heightM,
        thicknessMm: wall.blockType === "BLOCK_225MM" ? 225 : 150,
        blockType: wall.blockType,
      },
    });
    wallIdByTempId.set(wall.tempId, created.id);
  }

  for (const room of rooms) {
    if (room.areaM2 > 0) {
      await prisma.room.create({
        data: { levelId: level.id, name: room.name, areaM2: room.areaM2, roomType: room.roomType },
      });
    }
  }

  for (const opening of openings) {
    const wallId = wallIdByTempId.get(opening.wallTempId);
    if (wallId && opening.widthM > 0 && opening.heightM > 0) {
      await prisma.opening.create({
        data: {
          wallId,
          type: opening.type,
          widthM: opening.widthM,
          heightM: opening.heightM,
          quantity: opening.quantity || 1,
        },
      });
    }
  }

  await prisma.takeoffModel.update({
    where: { id: takeoff.id },
    data: { inputMethod: hadExistingLevels ? "HYBRID" : "PDF_EXTRACTED", status: "DRAFT" },
  });

  await prisma.extractionJob.update({
    where: { id: extractionJobId },
    data: { status: "REVIEWED", takeoffModelId: takeoff.id },
  });

  const reviewedPayload = JSON.parse(JSON.stringify({ walls, rooms, openings }));
  await prisma.extractionReviewLog.create({
    data: {
      extractionJobId,
      fieldChanged: "commit",
      originalValue: reviewedPayload,
      correctedValue: reviewedPayload,
      reviewedById: user.id,
    },
  });

  redirect(`/projects/${projectId}`);
}
