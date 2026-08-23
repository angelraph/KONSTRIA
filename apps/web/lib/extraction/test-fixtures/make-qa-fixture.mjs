import sharp from "sharp";
import { writeFileSync } from "node:fs";

// QA fixture for a full live upload -> extraction -> review -> BOQ run.
// Ground truth (100px = 1.0m, I control every coordinate):
//   Outer envelope: 8.0m x 5.5m (rectangle 50,50 to 850,600)
//   Internal partition wall at x=450px (4.0m from the left outer wall)
//   Main entrance door: bottom wall gap, 150-230px (0.8m wide)
//   Internal door: partition wall gap, y 480-560px (0.8m wide)
//   Window: right wall gap, y 150-250px (1.0m wide)
//   Two rooms: "LIVING ROOM" (left, ~4.0m x 5.5m) and "BEDROOM" (right, ~4.0m x 5.5m)
const svg = `
<svg width="900" height="700" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="700" fill="white"/>

  <!-- Top wall -->
  <line x1="50" y1="50" x2="850" y2="50" stroke="black" stroke-width="6"/>
  <!-- Left wall -->
  <line x1="50" y1="50" x2="50" y2="600" stroke="black" stroke-width="6"/>
  <!-- Bottom wall, split for main entrance door -->
  <line x1="50" y1="600" x2="150" y2="600" stroke="black" stroke-width="6"/>
  <line x1="230" y1="600" x2="850" y2="600" stroke="black" stroke-width="6"/>
  <!-- Right wall, split for window -->
  <line x1="850" y1="50" x2="850" y2="150" stroke="black" stroke-width="6"/>
  <line x1="850" y1="250" x2="850" y2="600" stroke="black" stroke-width="6"/>

  <!-- Internal partition wall, split for internal door -->
  <line x1="450" y1="50" x2="450" y2="480" stroke="black" stroke-width="6"/>
  <line x1="450" y1="560" x2="450" y2="600" stroke="black" stroke-width="6"/>

  <!-- Main entrance door swing (hinge at 150,600) -->
  <line x1="150" y1="600" x2="150" y2="520" stroke="black" stroke-width="2"/>
  <path d="M 150 520 A 80 80 0 0 1 230 600" fill="none" stroke="black" stroke-width="2"/>

  <!-- Internal door swing (hinge at 450,480) -->
  <line x1="450" y1="480" x2="530" y2="480" stroke="black" stroke-width="2"/>
  <path d="M 530 480 A 80 80 0 0 1 450 560" fill="none" stroke="black" stroke-width="2"/>

  <!-- Window ticks across the right-wall gap -->
  <line x1="835" y1="183" x2="865" y2="183" stroke="black" stroke-width="3"/>
  <line x1="835" y1="217" x2="865" y2="217" stroke="black" stroke-width="3"/>

  <!-- Room labels -->
  <text x="250" y="330" font-size="24" text-anchor="middle" font-family="sans-serif">LIVING ROOM</text>
  <text x="650" y="330" font-size="24" text-anchor="middle" font-family="sans-serif">BEDROOM</text>

  <!-- Dimension text -->
  <text x="450" y="35" font-size="20" text-anchor="middle" font-family="sans-serif">8000</text>
  <text x="30" y="325" font-size="20" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 30 325)">5500</text>
</svg>
`;

const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL("./qa-plan.png", import.meta.url), buffer);
console.log("Wrote qa-plan.png,", buffer.length, "bytes");
