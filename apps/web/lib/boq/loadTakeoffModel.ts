import { prisma } from "@konstria/db";
import type { TakeoffModel } from "@konstria/rules-engine";

export class TakeoffNotReviewedError extends Error {
  constructor() {
    super("Takeoff model must be status=REVIEWED before a BOQ can be generated");
    this.name = "TakeoffNotReviewedError";
  }
}

/**
 * Loads a TakeoffModel and all its nested entities from Postgres and maps
 * them into the plain shape the rules-engine (packages/rules-engine)
 * operates on. Refuses to load anything not yet REVIEWED — manual entry and
 * AI-extracted plans both converge on this same status gate before any
 * quantity is calculated from them.
 */
export async function loadTakeoffModel(
  takeoffModelId: string
): Promise<{ model: TakeoffModel; projectId: string; region: string }> {
  const record = await prisma.takeoffModel.findUniqueOrThrow({
    where: { id: takeoffModelId },
    include: {
      project: true,
      levels: { include: { rooms: true, walls: { include: { openings: true } } } },
      concreteElements: { include: { rebarSchedules: true } },
      roofPlanes: true,
    },
  });

  if (record.status !== "REVIEWED" && record.status !== "LOCKED") {
    throw new TakeoffNotReviewedError();
  }

  const model: TakeoffModel = {
    id: record.id,
    rooms: record.levels.flatMap((level) =>
      level.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        areaM2: room.areaM2,
        roomType: room.roomType,
      }))
    ),
    walls: record.levels.flatMap((level) =>
      level.walls.map((wall) => ({
        id: wall.id,
        roomAId: wall.roomAId ?? undefined,
        roomBId: wall.roomBId ?? undefined,
        lengthM: wall.lengthM,
        heightM: wall.heightM,
        blockType: wall.blockType,
        mortarMix: { cement: wall.mortarRatioCement, sand: wall.mortarRatioSand },
      }))
    ),
    openings: record.levels.flatMap((level) =>
      level.walls.flatMap((wall) =>
        wall.openings.map((opening) => ({
          id: opening.id,
          wallId: wall.id,
          type: opening.type,
          widthM: opening.widthM,
          heightM: opening.heightM,
          quantity: opening.quantity,
        }))
      )
    ),
    concreteElements: record.concreteElements.map((el) => ({
      id: el.id,
      stage: el.stage,
      description: el.description,
      volumeM3: el.volumeM3,
      mix: { cement: el.mixRatioCement, sand: el.mixRatioSand, granite: el.mixRatioGranite ?? undefined },
    })),
    rebarSchedules: record.concreteElements.flatMap((el) =>
      el.rebarSchedules.map((r) => ({
        id: r.id,
        elementId: el.id,
        diameterMm: r.diameterMm,
        lengthM: r.lengthM,
        quantity: r.quantity,
      }))
    ),
    roofPlanes: record.roofPlanes.map((rp) => ({
      id: rp.id,
      areaM2: rp.areaM2,
      sheetType: rp.sheetType,
      sheetLengthM: rp.sheetLengthM,
    })),
  };

  return { model, projectId: record.projectId, region: record.project.region };
}
