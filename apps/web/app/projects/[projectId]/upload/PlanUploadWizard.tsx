"use client";

import { useRef, useState } from "react";
import {
  commitExtraction,
  extractFromUpload,
  type ExtractionDraft,
  type ReviewedOpening,
  type ReviewedRoof,
  type ReviewedRoom,
  type ReviewedWall,
} from "./actions.js";

type Step = "select" | "calibrate" | "extracting" | "review";

interface CalibrationPoint {
  xPx: number;
  yPx: number;
}

export default function PlanUploadWizard({ projectId }: { projectId: string }) {
  const [step, setStep] = useState<Step>("select");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [points, setPoints] = useState<CalibrationPoint[]>([]);
  const [realWorldLengthM, setRealWorldLengthM] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [levelName, setLevelName] = useState("Ground Floor");
  const [floorHeightM, setFloorHeightM] = useState("3");
  const [reviewWalls, setReviewWalls] = useState<(ReviewedWall & { tempId: string })[]>([]);
  const [reviewRooms, setReviewRooms] = useState<ReviewedRoom[]>([]);
  const [reviewOpenings, setReviewOpenings] = useState<ReviewedOpening[]>([]);
  const [reviewRoof, setReviewRoof] = useState<ReviewedRoof>({
    areaM2: 0,
    sheetType: "LONG_SPAN_ALUMINIUM",
    sheetLengthM: 3.6,
  });
  const imgRef = useRef<HTMLImageElement>(null);

  function handleFileSelect(f: File) {
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setStep("calibrate");
    };
    reader.readAsDataURL(f);
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (points.length >= 2 || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    setPoints([...points, { xPx: displayX * scaleX, yPx: displayY * scaleY }]);
  }

  async function handleExtract() {
    if (!file || points.length !== 2 || !(Number(realWorldLengthM) > 0)) {
      setError("Click two points on the drawing and enter the real distance between them.");
      return;
    }
    setStep("extracting");
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("pointAX", String(points[0].xPx));
      formData.set("pointAY", String(points[0].yPx));
      formData.set("pointBX", String(points[1].xPx));
      formData.set("pointBY", String(points[1].yPx));
      formData.set("realWorldLengthM", realWorldLengthM);

      const result = await extractFromUpload(projectId, formData);
      setDraft(result);
      setReviewWalls(
        result.walls.map((w) => ({ tempId: w.tempId, lengthM: w.lengthM, heightM: Number(floorHeightM), blockType: "BLOCK_225MM" as const }))
      );
      setReviewRooms(result.roomLabels.map((r) => ({ name: r.text, areaM2: r.areaM2, roomType: "DRY" as const })));
      setReviewOpenings(
        result.openings.map((o) => ({
          wallTempId: o.wallTempId,
          type: o.type,
          widthM: o.widthM,
          heightM: o.suggestedHeightM,
          quantity: 1,
        }))
      );
      setReviewRoof({
        areaM2: result.suggestedRoofAreaM2,
        sheetType: "LONG_SPAN_ALUMINIUM",
        sheetLengthM: 3.6,
      });
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setStep("calibrate");
    }
  }

  async function handleCommit() {
    if (!draft) return;
    setError(null);
    try {
      await commitExtraction(
        projectId,
        draft.extractionJobId,
        levelName,
        Number(floorHeightM),
        reviewWalls,
        reviewRooms,
        reviewOpenings.filter((o) => o.widthM > 0 && o.heightM > 0),
        reviewRoof.areaM2 > 0 ? reviewRoof : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Please try again");
    }
  }

  return (
    <div className="mt-6">
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {step === "select" && (
        <div className="rounded border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            Upload a clear photo or scan of your floor plan (JPG or PNG). PDF support is coming soon.
            For now, export or photograph a single page.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="mt-4"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </div>
      )}

      {step === "calibrate" && imageUrl && (
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Click two points on the drawing that you know the real distance between (e.g. the two ends
            of an outer wall), then enter that distance. This is what turns pixels into metres. The AI
            never guesses real-world size on its own.
          </p>
          <div className="relative mt-4 inline-block max-w-full">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Uploaded floor plan"
              onClick={handleImageClick}
              onLoad={(e) =>
                setNaturalSize({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              className="max-h-[70vh] max-w-full cursor-crosshair border border-zinc-300 dark:border-zinc-700"
            />
            {naturalSize &&
              points.map((p, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/40"
                  style={{
                    left: `${(p.xPx / naturalSize.w) * 100}%`,
                    top: `${(p.yPx / naturalSize.h) * 100}%`,
                  }}
                />
              ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => setPoints([])}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              Reset points ({points.length}/2)
            </button>
            <label className="flex flex-col text-xs text-zinc-500">
              Real distance between the two points (m)
              <input
                type="number"
                step="0.01"
                value={realWorldLengthM}
                onChange={(e) => setRealWorldLengthM(e.target.value)}
                className="w-32 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="button"
              onClick={handleExtract}
              disabled={points.length !== 2}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Extract walls &amp; rooms
            </button>
          </div>
        </div>
      )}

      {step === "extracting" && (
        <p className="text-sm text-zinc-500">Reading the drawing with AI vision. This takes a few seconds...</p>
      )}

      {step === "review" && draft && (
        <div>
          <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Review every value below before saving. Wall lengths, room areas, and opening widths are
            calculated from your scale calibration, and opening heights use a standard default, but
            every number here is a starting point, not a final answer. Check each one against the
            drawing and correct anything that looks off before confirming.
          </p>

          {draft.extractionNotes && (
            <p className="mt-2 text-sm text-zinc-500">AI note: {draft.extractionNotes}</p>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-zinc-500">
              Level name
              <input value={levelName} onChange={(e) => setLevelName(e.target.value)} className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
            </label>
            <label className="flex flex-col text-xs text-zinc-500">
              Floor height (m)
              <input type="number" step="0.1" value={floorHeightM} onChange={(e) => setFloorHeightM(e.target.value)} className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
            </label>
          </div>

          <h3 className="mt-6 font-medium">Walls ({reviewWalls.length} detected)</h3>
          <div className="mt-2 space-y-2">
            {reviewWalls.map((wall, i) => (
              <div key={wall.tempId} className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-800">
                <label className="flex flex-col text-xs text-zinc-500">
                  Length (m)
                  <input
                    type="number"
                    step="0.01"
                    value={wall.lengthM}
                    onChange={(e) => {
                      const next = [...reviewWalls];
                      next[i] = { ...wall, lengthM: Number(e.target.value) };
                      setReviewWalls(next);
                    }}
                    className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col text-xs text-zinc-500">
                  Height (m)
                  <input
                    type="number"
                    step="0.1"
                    value={wall.heightM}
                    onChange={(e) => {
                      const next = [...reviewWalls];
                      next[i] = { ...wall, heightM: Number(e.target.value) };
                      setReviewWalls(next);
                    }}
                    className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col text-xs text-zinc-500">
                  Block
                  <select
                    value={wall.blockType}
                    onChange={(e) => {
                      const next = [...reviewWalls];
                      next[i] = { ...wall, blockType: e.target.value as "BLOCK_225MM" | "BLOCK_150MM" };
                      setReviewWalls(next);
                    }}
                    className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="BLOCK_225MM">9-inch (225mm)</option>
                    <option value="BLOCK_150MM">6-inch (150mm)</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setReviewWalls(reviewWalls.filter((_, idx) => idx !== i))}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <h3 className="mt-6 font-medium">Rooms ({reviewRooms.length} detected)</h3>
          <div className="mt-2 space-y-2">
            {reviewRooms.map((room, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-800">
                <label className="flex flex-col text-xs text-zinc-500">
                  Name
                  <input
                    value={room.name}
                    onChange={(e) => {
                      const next = [...reviewRooms];
                      next[i] = { ...room, name: e.target.value };
                      setReviewRooms(next);
                    }}
                    className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col text-xs text-zinc-500">
                  Area (m²), estimated from the plan, check and correct
                  <input
                    type="number"
                    step="0.1"
                    value={room.areaM2 || ""}
                    onChange={(e) => {
                      const next = [...reviewRooms];
                      next[i] = { ...room, areaM2: Number(e.target.value) };
                      setReviewRooms(next);
                    }}
                    className="w-28 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col text-xs text-zinc-500">
                  Type
                  <select
                    value={room.roomType}
                    onChange={(e) => {
                      const next = [...reviewRooms];
                      next[i] = { ...room, roomType: e.target.value as "WET" | "DRY" };
                      setReviewRooms(next);
                    }}
                    className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="DRY">Dry</option>
                    <option value="WET">Wet</option>
                  </select>
                </label>
              </div>
            ))}
          </div>

          {reviewOpenings.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">
                Possible openings ({reviewOpenings.length} flagged, sizes estimated, check and correct or clear to skip)
              </h3>
              <div className="mt-2 space-y-2">
                {reviewOpenings.map((opening, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500">{opening.type === "DOOR" ? "Door" : "Window"}</span>
                    <label className="flex flex-col text-xs text-zinc-500">
                      Width (m)
                      <input
                        type="number"
                        step="0.1"
                        value={opening.widthM || ""}
                        onChange={(e) => {
                          const next = [...reviewOpenings];
                          next[i] = { ...opening, widthM: Number(e.target.value) };
                          setReviewOpenings(next);
                        }}
                        className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="flex flex-col text-xs text-zinc-500">
                      Height (m)
                      <input
                        type="number"
                        step="0.1"
                        value={opening.heightM || ""}
                        onChange={(e) => {
                          const next = [...reviewOpenings];
                          next[i] = { ...opening, heightM: Number(e.target.value) };
                          setReviewOpenings(next);
                        }}
                        className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="mt-6 font-medium">Roof</h3>
          <p className="text-xs text-zinc-500">
            Area is estimated from the wall footprint plus a standard eave overhang, not read off the
            plan (roof shape isn&apos;t visible on a floor plan). Sheet length is a common stocked
            default. Both need your confirmation, or clear the area to skip roofing entirely.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-800">
            <label className="flex flex-col text-xs text-zinc-500">
              Area (m²)
              <input
                type="number"
                step="0.1"
                value={reviewRoof.areaM2 || ""}
                onChange={(e) => setReviewRoof({ ...reviewRoof, areaM2: Number(e.target.value) })}
                className="w-28 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col text-xs text-zinc-500">
              Sheet type
              <select
                value={reviewRoof.sheetType}
                onChange={(e) =>
                  setReviewRoof({ ...reviewRoof, sheetType: e.target.value as "LONG_SPAN_ALUMINIUM" | "CORRUGATED_STANDARD" })
                }
                className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="LONG_SPAN_ALUMINIUM">Long-span aluminium</option>
                <option value="CORRUGATED_STANDARD">Corrugated standard</option>
              </select>
            </label>
            <label className="flex flex-col text-xs text-zinc-500">
              Sheet length (m)
              <input
                type="number"
                step="0.1"
                value={reviewRoof.sheetLengthM || ""}
                onChange={(e) => setReviewRoof({ ...reviewRoof, sheetLengthM: Number(e.target.value) })}
                className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>

          {draft.dimensionTexts.length > 0 && (
            <p className="mt-6 text-xs text-zinc-500">
              Dimension text found on the drawing (for cross-checking your entries above):{" "}
              {draft.dimensionTexts.join(", ")}
            </p>
          )}

          <button
            type="button"
            onClick={handleCommit}
            className="mt-6 rounded bg-emerald-700 px-4 py-2 text-sm text-white"
          >
            Confirm &amp; add to takeoff
          </button>
        </div>
      )}
    </div>
  );
}
