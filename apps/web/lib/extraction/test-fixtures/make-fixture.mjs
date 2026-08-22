import sharp from "sharp";
import { writeFileSync } from "node:fs";

// A synthetic floor plan I fully control the ground truth of: an outer
// 700x500px rectangle (walls), one internal partition wall at x=400 with a
// door gap near the bottom, two room labels, and two printed dimension
// texts. Used to verify the OpenAI extraction call actually works and
// returns sane geometry, without needing (or risking copyright on) a real
// architect's drawing.
const svg = `
<svg width="800" height="650" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="650" fill="white"/>
  <rect x="50" y="50" width="700" height="500" fill="none" stroke="black" stroke-width="6"/>
  <line x1="400" y1="50" x2="400" y2="480" stroke="black" stroke-width="6"/>
  <text x="225" y="300" font-size="22" text-anchor="middle" font-family="sans-serif">LIVING ROOM</text>
  <text x="575" y="300" font-size="22" text-anchor="middle" font-family="sans-serif">BEDROOM 1</text>
  <text x="400" y="35" font-size="20" text-anchor="middle" font-family="sans-serif">7.0M</text>
  <text x="30" y="300" font-size="20" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 30 300)">5.0M</text>
</svg>
`;

const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL("./sample-plan.png", import.meta.url), buffer);
console.log("Wrote sample-plan.png,", buffer.length, "bytes");
