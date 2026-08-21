import { z } from "zod";

export const blockTypeSchema = z.enum(["BLOCK_225MM", "BLOCK_150MM"]);

export const mixRatioSchema = z.object({
  cement: z.number().positive(),
  sand: z.number().positive(),
  granite: z.number().positive().optional(),
});

export const openingSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  type: z.enum(["DOOR", "WINDOW"]),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
  quantity: z.number().int().positive(),
});

export const wallSchema = z.object({
  id: z.string(),
  roomAId: z.string().optional(),
  roomBId: z.string().optional(),
  lengthM: z.number().positive(),
  heightM: z.number().positive(),
  blockType: blockTypeSchema,
  mortarMix: mixRatioSchema,
  // Plan-space coordinates, populated when the wall came from PDF/image
  // extraction; absent for purely manual entry.
  startPoint: z.tuple([z.number(), z.number()]).optional(),
  endPoint: z.tuple([z.number(), z.number()]).optional(),
});

export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  areaM2: z.number().positive(),
  roomType: z.enum(["WET", "DRY"]),
});

export const concreteElementSchema = z.object({
  id: z.string(),
  stage: z.enum(["SUBSTRUCTURE", "SUPERSTRUCTURE"]),
  description: z.string(),
  volumeM3: z.number().positive(),
  mix: mixRatioSchema,
});

export const rebarScheduleSchema = z.object({
  id: z.string(),
  elementId: z.string(),
  diameterMm: z.number().positive(),
  lengthM: z.number().positive(),
  quantity: z.number().int().positive(),
});

export const roofPlaneSchema = z.object({
  id: z.string(),
  areaM2: z.number().positive(),
  sheetType: z.enum(["LONG_SPAN_ALUMINIUM", "CORRUGATED_STANDARD"]),
  sheetLengthM: z.number().positive(),
});

export const takeoffModelSchema = z.object({
  id: z.string(),
  inputMethod: z.enum(["MANUAL", "PDF_EXTRACTED", "HYBRID"]),
  status: z.enum(["DRAFT", "REVIEWED", "LOCKED"]),
  rooms: z.array(roomSchema),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
  concreteElements: z.array(concreteElementSchema),
  rebarSchedules: z.array(rebarScheduleSchema),
  roofPlanes: z.array(roofPlaneSchema),
});

export type BlockType = z.infer<typeof blockTypeSchema>;
export type MixRatio = z.infer<typeof mixRatioSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Room = z.infer<typeof roomSchema>;
export type ConcreteElement = z.infer<typeof concreteElementSchema>;
export type RebarSchedule = z.infer<typeof rebarScheduleSchema>;
export type RoofPlane = z.infer<typeof roofPlaneSchema>;
export type TakeoffModel = z.infer<typeof takeoffModelSchema>;
