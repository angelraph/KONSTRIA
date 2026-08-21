import { z } from "zod";

/**
 * Structured output schema requested from the vision model when reading an
 * uploaded, scale-calibrated floor plan image. Coordinates are in the
 * original image's pixel space; the caller converts to metres using the
 * user-supplied scale calibration (pxPerMetre) before writing a draft
 * TakeoffModel. This output is NEVER written directly as a "reviewed"
 * takeoff — it always lands as status=DRAFT pending human correction.
 */
export const extractedWallSchema = z.object({
  tempId: z.string(),
  startPx: z.tuple([z.number(), z.number()]),
  endPx: z.tuple([z.number(), z.number()]),
  thicknessMmGuess: z.number().positive().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedOpeningSchema = z.object({
  tempId: z.string(),
  wallTempId: z.string(),
  type: z.enum(["DOOR", "WINDOW"]),
  positionPx: z.tuple([z.number(), z.number()]),
  widthMmGuess: z.number().positive().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedRoomLabelSchema = z.object({
  tempId: z.string(),
  text: z.string(),
  centroidPx: z.tuple([z.number(), z.number()]),
  confidence: z.number().min(0).max(1),
});

export const extractedDimensionTextSchema = z.object({
  text: z.string(),
  positionPx: z.tuple([z.number(), z.number()]),
});

export const planExtractionResultSchema = z.object({
  walls: z.array(extractedWallSchema),
  openings: z.array(extractedOpeningSchema),
  roomLabels: z.array(extractedRoomLabelSchema),
  dimensionTexts: z.array(extractedDimensionTextSchema),
  /** Model's own note on ambiguity/legibility, surfaced to the reviewer. */
  extractionNotes: z.string().optional(),
});

export const scaleCalibrationSchema = z.object({
  pointAPx: z.tuple([z.number(), z.number()]),
  pointBPx: z.tuple([z.number(), z.number()]),
  realWorldLengthM: z.number().positive(),
});

export type ExtractedWall = z.infer<typeof extractedWallSchema>;
export type ExtractedOpening = z.infer<typeof extractedOpeningSchema>;
export type ExtractedRoomLabel = z.infer<typeof extractedRoomLabelSchema>;
export type PlanExtractionResult = z.infer<typeof planExtractionResultSchema>;
export type ScaleCalibration = z.infer<typeof scaleCalibrationSchema>;

export function pxPerMetre(calibration: ScaleCalibration): number {
  const [ax, ay] = calibration.pointAPx;
  const [bx, by] = calibration.pointBPx;
  const distancePx = Math.hypot(bx - ax, by - ay);
  return distancePx / calibration.realWorldLengthM;
}
