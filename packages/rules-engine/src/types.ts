import type { BlockType, MixRatio } from "./constants/ng-standards.js";

export interface Opening {
  id: string;
  wallId: string;
  type: "DOOR" | "WINDOW";
  widthM: number;
  heightM: number;
  quantity: number;
}

export interface Wall {
  id: string;
  roomAId?: string;
  roomBId?: string;
  lengthM: number;
  heightM: number;
  blockType: BlockType;
  mortarMix: MixRatio;
}

export interface Room {
  id: string;
  name: string;
  areaM2: number;
  roomType: "WET" | "DRY";
}

export interface ConcreteElement {
  id: string;
  stage: "SUBSTRUCTURE" | "SUPERSTRUCTURE";
  description: string;
  volumeM3: number;
  mix: MixRatio;
}

export interface RebarSchedule {
  id: string;
  elementId: string;
  diameterMm: number;
  lengthM: number;
  quantity: number;
}

export interface RoofPlane {
  id: string;
  areaM2: number;
  sheetType: "LONG_SPAN_ALUMINIUM" | "CORRUGATED_STANDARD";
  sheetLengthM: number;
}

export interface TakeoffModel {
  id: string;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  concreteElements: ConcreteElement[];
  rebarSchedules: RebarSchedule[];
  roofPlanes: RoofPlane[];
}

export type SourceRef = { entityType: string; entityId: string };

export interface LineItem {
  stage: string;
  description: string;
  quantity: number;
  unit: string;
  materialCode?: string;
  sourceRefs: SourceRef[];
}
