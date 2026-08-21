import Link from "next/link";
import { prisma } from "@konstria/db";
import { ensureAccount } from "../../../lib/ensureAccount.js";
import {
  addConcreteElement,
  addLevel,
  addOpening,
  addRebarSchedule,
  addRoofPlane,
  addRoom,
  addWall,
  generateBOQ,
  markReviewed,
} from "./actions.js";

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const user = await ensureAccount();

  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, organizationId: user.organizationId },
  });

  const takeoff = await prisma.takeoffModel.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    include: {
      levels: { include: { rooms: true, walls: { include: { openings: true } } }, orderBy: { order: "asc" } },
      concreteElements: { include: { rebarSchedules: true } },
      roofPlanes: true,
    },
  });

  const snapshots = await prisma.bOQSnapshot.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
  });

  const walls = takeoff?.levels.flatMap((l) => l.walls) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
      <p className="text-sm text-zinc-500">{project.region} · {project.currency}</p>

      {takeoff && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <span className="text-sm">
            Takeoff status: <strong>{takeoff.status}</strong>
          </span>
          {takeoff.status === "DRAFT" && (
            <form action={markReviewed.bind(null, projectId)}>
              <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
                Mark reviewed
              </button>
            </form>
          )}
          {(takeoff.status === "REVIEWED" || takeoff.status === "LOCKED") && (
            <form action={generateBOQ.bind(null, projectId)}>
              <button type="submit" className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white">
                Generate BOQ
              </button>
            </form>
          )}
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-medium text-zinc-500">Past BOQ versions</h2>
          <ul className="mt-1 flex flex-wrap gap-2">
            {snapshots.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/projects/${projectId}/boq/${s.id}`}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  v{s.version} ({s.status})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-medium">Levels</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {takeoff?.levels.map((level) => (
            <li key={level.id}>
              {level.name}, floor height {level.floorHeightM}m
            </li>
          ))}
        </ul>
        <form action={addLevel.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Name
            <input name="name" required placeholder="First Floor" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Floor height (m)
            <input name="floorHeightM" type="number" step="0.1" required className="w-28 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add level
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Rooms</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {takeoff?.levels.flatMap((l) => l.rooms).map((room) => (
            <li key={room.id}>
              {room.name}, {room.areaM2} m² ({room.roomType})
            </li>
          ))}
        </ul>
        <form action={addRoom.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Level
            <select name="levelId" required className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              {takeoff?.levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Name
            <input name="name" required placeholder="Living Room" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Area (m²)
            <input name="areaM2" type="number" step="0.1" required className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Type
            <select name="roomType" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="DRY">Dry</option>
              <option value="WET">Wet</option>
            </select>
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add room
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Walls</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {walls.map((wall) => (
            <li key={wall.id}>
              {wall.lengthM}m × {wall.heightM}m, {wall.blockType === "BLOCK_225MM" ? "9-inch" : "6-inch"} block
              {wall.openings.length > 0 && `, ${wall.openings.length} opening(s)`}
            </li>
          ))}
        </ul>
        <form action={addWall.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Level
            <select name="levelId" required className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              {takeoff?.levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Length (m)
            <input name="lengthM" type="number" step="0.1" required className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Height (m)
            <input name="heightM" type="number" step="0.1" required className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Block
            <select name="blockType" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="BLOCK_225MM">9-inch (225mm)</option>
              <option value="BLOCK_150MM">6-inch (150mm)</option>
            </select>
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add wall
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Openings (doors/windows)</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {walls.flatMap((w) => w.openings).map((o) => (
            <li key={o.id}>
              {o.type === "DOOR" ? "Door" : "Window"}: {o.widthM}m × {o.heightM}m × {o.quantity}
            </li>
          ))}
        </ul>
        <form action={addOpening.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Wall
            <select name="wallId" required className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              {walls.map((wall) => (
                <option key={wall.id} value={wall.id}>
                  {wall.lengthM}m × {wall.heightM}m
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Type
            <select name="type" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="DOOR">Door</option>
              <option value="WINDOW">Window</option>
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Width (m)
            <input name="widthM" type="number" step="0.1" required className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Height (m)
            <input name="heightM" type="number" step="0.1" required className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Qty
            <input name="quantity" type="number" defaultValue={1} required className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add opening
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Concrete elements (foundation, columns, slabs...)</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {takeoff?.concreteElements.map((el) => (
            <li key={el.id}>
              {el.description} ({el.stage}), {el.volumeM3} m³, mix {el.mixRatioCement}:{el.mixRatioSand}
              {el.mixRatioGranite ? `:${el.mixRatioGranite}` : ""}
              {el.rebarSchedules.length > 0 && `, ${el.rebarSchedules.length} rebar row(s)`}
            </li>
          ))}
        </ul>
        <form action={addConcreteElement.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Stage
            <select name="stage" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="SUBSTRUCTURE">Substructure</option>
              <option value="SUPERSTRUCTURE">Superstructure</option>
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Description
            <input name="description" required placeholder="Foundation footing" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Volume (m³)
            <input name="volumeM3" type="number" step="0.1" required className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Mix cement
            <input name="mixRatioCement" type="number" defaultValue={1} required className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Mix sand
            <input name="mixRatioSand" type="number" defaultValue={3} required className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Mix granite
            <input name="mixRatioGranite" type="number" defaultValue={6} className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add element
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Reinforcement (per concrete element)</h2>
        <form action={addRebarSchedule.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Element
            <select name="structuralElementId" required className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              {takeoff?.concreteElements.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.description}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Diameter (mm)
            <input name="diameterMm" type="number" required className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Length (m)
            <input name="lengthM" type="number" step="0.1" required className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Qty
            <input name="quantity" type="number" required className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add rebar row
          </button>
        </form>
      </section>

      <section className="mt-8 mb-16">
        <h2 className="font-medium">Roof planes</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {takeoff?.roofPlanes.map((rp) => (
            <li key={rp.id}>
              {rp.areaM2} m², {rp.sheetType === "LONG_SPAN_ALUMINIUM" ? "long-span aluminium" : "corrugated"}, {rp.sheetLengthM}m sheets
            </li>
          ))}
        </ul>
        <form action={addRoofPlane.bind(null, projectId)} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-zinc-500">
            Area (m²)
            <input name="areaM2" type="number" step="0.1" required className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Sheet type
            <select name="sheetType" className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              <option value="LONG_SPAN_ALUMINIUM">Long-span aluminium</option>
              <option value="CORRUGATED_STANDARD">Corrugated standard</option>
            </select>
          </label>
          <label className="flex flex-col text-xs text-zinc-500">
            Sheet length (m)
            <input name="sheetLengthM" type="number" step="0.1" required className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <button type="submit" className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Add roof plane
          </button>
        </form>
      </section>
    </div>
  );
}
