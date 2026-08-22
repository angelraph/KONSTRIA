import { put } from "@vercel/blob";

// The project's Blob store is configured private (floor plans are project
// data, not public assets) — this just records provenance for
// FloorPlanUpload.fileUrl. The calibration/review screens work off the
// image the browser already holds in memory, not this stored copy.
export async function uploadPlanImage(projectId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname = `floor-plans/${projectId}/${Date.now()}-${safeName}`;
  const blob = await put(pathname, file, { access: "private", addRandomSuffix: false });
  return blob.url;
}
