import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// Kept separate from shared-types' extraction schema (which has optional
// fields aimed at the DB/API layer): OpenAI's strict structured-output mode
// requires every property to be present in `required`, so every field here
// is mandatory (empty string/array when there's nothing to report) and
// pixel coordinates are flat x/y numbers rather than tuples.
const wallSchema = z.object({
  tempId: z.string(),
  startXPx: z.number(),
  startYPx: z.number(),
  endXPx: z.number(),
  endYPx: z.number(),
  confidence: z.number().min(0).max(1),
});

const openingSchema = z.object({
  tempId: z.string(),
  wallTempId: z.string(),
  type: z.enum(["DOOR", "WINDOW"]),
  xPx: z.number(),
  yPx: z.number(),
  confidence: z.number().min(0).max(1),
});

const roomLabelSchema = z.object({
  tempId: z.string(),
  text: z.string(),
  centroidXPx: z.number(),
  centroidYPx: z.number(),
  confidence: z.number().min(0).max(1),
});

const dimensionTextSchema = z.object({
  text: z.string(),
  xPx: z.number(),
  yPx: z.number(),
});

const openAiExtractionSchema = z.object({
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
  roomLabels: z.array(roomLabelSchema),
  dimensionTexts: z.array(dimensionTextSchema),
  extractionNotes: z.string(),
});

export type OpenAiExtractionResult = z.infer<typeof openAiExtractionSchema>;

const EXTRACTION_PROMPT = `You are reading an architectural floor plan image for a Nigerian quantity surveyor. Identify:

- walls: every wall as a straight line segment in PIXEL coordinates (startXPx, startYPx, endXPx, endYPx) as measured on the image as given to you. Include only load-bearing/partition walls, not furniture or dimension lines.
- openings: doors and windows, each linked to the wall it sits on via wallTempId, positioned at its approximate center in pixel coordinates.
- roomLabels: any room name text printed on the plan (e.g. "LIVING ROOM", "BEDROOM 1"), with the pixel coordinates of that room's approximate center.
- dimensionTexts: any printed dimension numbers/text on the drawing (e.g. "4200", "3.6m"), with their pixel position. Transcribe exactly what is printed — do not convert units or compute anything.
- extractionNotes: a short note on anything ambiguous, illegible, or uncertain about the drawing (empty string if nothing to flag).

Give every wall, opening, and room label a short unique tempId string (e.g. "w1", "o1", "r1"). Set confidence between 0 and 1 based on how legible/certain each detection is. Do not guess dimensions in real-world units — pixel coordinates only, exactly as they appear in the supplied image.`;

/**
 * Sends a floor-plan image to OpenAI's vision model and returns a
 * schema-validated structured extraction. Never fabricates real-world
 * measurements itself — it only reports pixel geometry and transcribed
 * text; converting to metres using the user's scale calibration happens
 * separately, and every result still goes through mandatory human review
 * before it can become part of a takeoff.
 */
export async function extractPlan(imageDataUrl: string): Promise<OpenAiExtractionResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }],
      },
    ],
    response_format: zodResponseFormat(openAiExtractionSchema, "plan_extraction"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("OpenAI extraction returned no parsed result");
  }
  return parsed;
}
