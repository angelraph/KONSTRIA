import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("../../../.env.local", import.meta.url), "utf-8");
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const { extractPlan } = await import("../openaiExtract.ts");

const imageBuffer = readFileSync(new URL("./sample-plan.png", import.meta.url));
const dataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;

const result = await extractPlan(dataUrl);
console.log(JSON.stringify(result, null, 2));
