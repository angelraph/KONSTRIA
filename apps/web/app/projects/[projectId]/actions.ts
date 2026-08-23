"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@konstria/db";
import { persistSnapshot } from "../../../lib/boq/persistSnapshot.js";
import { requireProjectAccess } from "../../../lib/requireProjectAccess.js";
import { getOrCreateTakeoffModel } from "../../../lib/getOrCreateTakeoffModel.js";

export async function addLevel(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const takeoff = await getOrCreateTakeoffModel(projectId);

  const name = String(formData.get("name") ?? "").trim();
  const floorHeightM = Number(formData.get("floorHeightM"));
  if (!name || !(floorHeightM > 0)) throw new Error("Level name and a positive floor height are required");

  const count = await prisma.level.count({ where: { takeoffModelId: takeoff.id } });
  await prisma.level.create({
    data: { takeoffModelId: takeoff.id, name, floorHeightM, order: count },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function addRoom(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const levelId = String(formData.get("levelId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const areaM2 = Number(formData.get("areaM2"));
  const roomType = String(formData.get("roomType") ?? "DRY") as "WET" | "DRY";
  if (!levelId || !name || !(areaM2 > 0)) throw new Error("Room name, level, and a positive area are required");

  const level = await prisma.level.findFirst({ where: { id: levelId, takeoffModel: { projectId } } });
  if (!level) throw new Error("Level not found in this project");

  await prisma.room.create({ data: { levelId, name, areaM2, roomType } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addWall(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const levelId = String(formData.get("levelId") ?? "");
  const lengthM = Number(formData.get("lengthM"));
  const heightM = Number(formData.get("heightM"));
  const blockType = String(formData.get("blockType") ?? "BLOCK_225MM") as "BLOCK_225MM" | "BLOCK_150MM";
  const thicknessMm = blockType === "BLOCK_225MM" ? 225 : 150;
  if (!levelId || !(lengthM > 0) || !(heightM > 0)) {
    throw new Error("Wall level, length, and height are required");
  }

  const level = await prisma.level.findFirst({ where: { id: levelId, takeoffModel: { projectId } } });
  if (!level) throw new Error("Level not found in this project");

  await prisma.wall.create({
    data: { levelId, lengthM, heightM, blockType, thicknessMm },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function addOpening(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const wallId = String(formData.get("wallId") ?? "");
  const type = String(formData.get("type") ?? "DOOR") as "DOOR" | "WINDOW";
  const widthM = Number(formData.get("widthM"));
  const heightM = Number(formData.get("heightM"));
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!wallId || !(widthM > 0) || !(heightM > 0) || !(quantity > 0)) {
    throw new Error("Opening wall, width, height, and quantity are required");
  }

  const wall = await prisma.wall.findFirst({ where: { id: wallId, level: { takeoffModel: { projectId } } } });
  if (!wall) throw new Error("Wall not found in this project");

  await prisma.opening.create({ data: { wallId, type, widthM, heightM, quantity } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addConcreteElement(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const takeoff = await getOrCreateTakeoffModel(projectId);

  const stage = String(formData.get("stage") ?? "SUBSTRUCTURE") as "SUBSTRUCTURE" | "SUPERSTRUCTURE";
  const description = String(formData.get("description") ?? "").trim();
  const volumeM3 = Number(formData.get("volumeM3"));
  const mixRatioCement = Number(formData.get("mixRatioCement"));
  const mixRatioSand = Number(formData.get("mixRatioSand"));
  const graniteRaw = formData.get("mixRatioGranite");
  const mixRatioGranite = graniteRaw ? Number(graniteRaw) : undefined;

  if (!description || !(volumeM3 > 0) || !(mixRatioCement > 0) || !(mixRatioSand > 0)) {
    throw new Error("Concrete element description, volume, and mix ratio are required");
  }

  await prisma.structuralElement.create({
    data: {
      takeoffModelId: takeoff.id,
      stage,
      description,
      volumeM3,
      mixRatioCement,
      mixRatioSand,
      mixRatioGranite,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function addRebarSchedule(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const structuralElementId = String(formData.get("structuralElementId") ?? "");
  const diameterMm = Number(formData.get("diameterMm"));
  const lengthM = Number(formData.get("lengthM"));
  const quantity = Number(formData.get("quantity"));
  if (!structuralElementId || !(diameterMm > 0) || !(lengthM > 0) || !(quantity > 0)) {
    throw new Error("Rebar element, diameter, length, and quantity are required");
  }

  const element = await prisma.structuralElement.findFirst({
    where: { id: structuralElementId, takeoffModel: { projectId } },
  });
  if (!element) throw new Error("Structural element not found in this project");

  await prisma.rebarSchedule.create({ data: { structuralElementId, diameterMm, lengthM, quantity } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addRoofPlane(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const takeoff = await getOrCreateTakeoffModel(projectId);

  const areaM2 = Number(formData.get("areaM2"));
  const sheetType = String(formData.get("sheetType") ?? "LONG_SPAN_ALUMINIUM") as
    | "LONG_SPAN_ALUMINIUM"
    | "CORRUGATED_STANDARD";
  const sheetLengthM = Number(formData.get("sheetLengthM"));
  if (!(areaM2 > 0) || !(sheetLengthM > 0)) {
    throw new Error("Roof plane area and sheet length are required");
  }

  await prisma.roofPlane.create({
    data: { takeoffModelId: takeoff.id, areaM2, sheetType, sheetLengthM },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function markReviewed(projectId: string) {
  await requireProjectAccess(projectId);
  const takeoff = await getOrCreateTakeoffModel(projectId);
  await prisma.takeoffModel.update({ where: { id: takeoff.id }, data: { status: "REVIEWED" } });
  revalidatePath(`/projects/${projectId}`);
}

export async function generateBOQ(projectId: string) {
  const { user } = await requireProjectAccess(projectId);
  const takeoff = await getOrCreateTakeoffModel(projectId);
  const snapshot = await persistSnapshot(takeoff.id, user.id);
  redirect(`/projects/${projectId}/boq/${snapshot.id}`);
}
