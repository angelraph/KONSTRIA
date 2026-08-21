// One-off seed runner using the Neon HTTP driver directly (bypasses Prisma's
// TCP-based query engine). Use this only in environments where raw Postgres
// TCP (port 5432) isn't reachable; `pnpm run seed` (prisma/seed.ts) is the
// normal path everywhere else (CI, Vercel, local dev with full network access).
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const MATERIALS = [
  { code: "CEMENT_50KG_BAG", name: "Cement (50kg bag)", unit: "BAG", category: "CONCRETE", aliases: ["cement", "dangote cement", "bua cement", "lafarge cement", "50kg cement bag"] },
  { code: "SHARP_SAND", name: "Sharp sand", unit: "M3", category: "CONCRETE", aliases: ["sharp sand", "coarse sand"] },
  { code: "GRANITE", name: "Granite chippings", unit: "M3", category: "CONCRETE", aliases: ["granite", "granite chippings", "3/4 granite", "1/2 granite"] },
  { code: "BLOCK_225MM", name: "Sandcrete block (9-inch, 225mm)", unit: "NO", category: "BLOCKWORK", aliases: ["9-inch block", "9inch block", "225mm block"] },
  { code: "BLOCK_150MM", name: "Sandcrete block (6-inch, 150mm)", unit: "NO", category: "BLOCKWORK", aliases: ["6-inch block", "6inch block", "150mm block"] },
  { code: "REBAR_8MM", name: "Reinforcement bar, Y8mm", unit: "M", category: "REINFORCEMENT", aliases: ["8mm rod", "8mm rebar", "y8"] },
  { code: "REBAR_10MM", name: "Reinforcement bar, Y10mm", unit: "M", category: "REINFORCEMENT", aliases: ["10mm rod", "10mm rebar", "y10"] },
  { code: "REBAR_12MM", name: "Reinforcement bar, Y12mm", unit: "M", category: "REINFORCEMENT", aliases: ["12mm rod", "12mm rebar", "y12"] },
  { code: "REBAR_16MM", name: "Reinforcement bar, Y16mm", unit: "M", category: "REINFORCEMENT", aliases: ["16mm rod", "16mm rebar", "y16"] },
  { code: "REBAR_20MM", name: "Reinforcement bar, Y20mm", unit: "M", category: "REINFORCEMENT", aliases: ["20mm rod", "20mm rebar", "y20"] },
  { code: "REBAR_25MM", name: "Reinforcement bar, Y25mm", unit: "M", category: "REINFORCEMENT", aliases: ["25mm rod", "25mm rebar", "y25"] },
  { code: "REBAR_TONNAGE", name: "Reinforcement steel (by weight)", unit: "TONNE", category: "REINFORCEMENT", aliases: ["iron rod per ton", "reinforcement per tonne", "steel rod per ton"] },
  { code: "ROOF_SHEET_LONG_SPAN_ALUMINIUM", name: "Long-span aluminium roofing sheet", unit: "NO", category: "ROOFING", aliases: ["long-span aluminium", "long span aluminum"] },
  { code: "ROOF_SHEET_CORRUGATED_STANDARD", name: "Corrugated roofing sheet", unit: "NO", category: "ROOFING", aliases: ["corrugated sheet", "zinc sheet"] },
  { code: "DOOR", name: "Door", unit: "NO", category: "OPENINGS", aliases: ["door"] },
  { code: "DOOR_FRAME", name: "Door frame material", unit: "M", category: "OPENINGS", aliases: ["door frame"] },
  { code: "WINDOW", name: "Window", unit: "NO", category: "OPENINGS", aliases: ["window"] },
  { code: "WINDOW_FRAME", name: "Window frame material", unit: "M", category: "OPENINGS", aliases: ["window frame", "aluminium window frame"] },
  { code: "GLASS", name: "Window glazing", unit: "M2", category: "OPENINGS", aliases: ["glass", "glazing"] },
  { code: "EMULSION_PAINT", name: "Emulsion paint", unit: "LITRE", category: "FINISHES", aliases: ["emulsion paint", "dulux emulsion"] },
];

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

for (const m of MATERIALS) {
  await sql.query(
    `INSERT INTO "MaterialCanonical" (id, code, name, unit, category, aliases)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (code) DO UPDATE SET name = $3, unit = $4, category = $5, aliases = $6`,
    [cuid(), m.code, m.name, m.unit, m.category, m.aliases]
  );
  console.log(`Upserted ${m.code}`);
}

await sql.query(
  `INSERT INTO "RuleEngineVersion" (id, "versionTag", "releasedAt", changelog)
   VALUES ($1, $2, NOW(), $3)
   ON CONFLICT ("versionTag") DO NOTHING`,
  [cuid(), "1.0.0", "Initial stages: substructure/superstructure concrete, blockwork, reinforcement, roofing, openings, finishes."]
);
console.log("Upserted RuleEngineVersion 1.0.0");
