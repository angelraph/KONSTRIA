import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Every code here must match a materialCode a rules-engine stage actually
// emits (see packages/rules-engine/src/stages/*.ts) or a scraper adapter
// actually resolves to (see apps/scraper-worker/src/sources/*.ts) — this is
// the join point between "quantities" and "real prices" described in the plan.
const MATERIALS: Array<{
  code: string;
  name: string;
  unit: string;
  category: string;
  aliases: string[];
}> = [
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

async function main() {
  for (const material of MATERIALS) {
    await prisma.materialCanonical.upsert({
      where: { code: material.code },
      update: { name: material.name, unit: material.unit, category: material.category, aliases: material.aliases },
      create: material,
    });
  }

  await prisma.ruleEngineVersion.upsert({
    where: { versionTag: "1.0.0" },
    update: {},
    create: {
      versionTag: "1.0.0",
      changelog: "Initial stages: substructure/superstructure concrete, blockwork, reinforcement, roofing, openings, finishes.",
    },
  });

  console.log(`Seeded ${MATERIALS.length} canonical materials and rule engine version 1.0.0`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
