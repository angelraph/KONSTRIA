import { describe, expect, it } from "vitest";
import { calculateReinforcement } from "./reinforcement.js";
import type { RebarSchedule } from "../types.js";

describe("calculateReinforcement", () => {
  it("computes weight using W(kg/m) = D^2/162", () => {
    // Hand-verified: Y16mm, unit weight = 16^2/162 = 256/162 = 1.580246913 kg/m.
    // 10 bars x 6m = 60m total length. Weight = 60 * 1.580246913 = 94.814814... kg.
    // +5% wastage / 1000 = 0.0995555... tonnes -> 0.100 at 3dp.
    const schedule: RebarSchedule = {
      id: "r1",
      elementId: "c1",
      diameterMm: 16,
      lengthM: 6,
      quantity: 10,
    };

    const result = calculateReinforcement([schedule]);
    const barLine = result.find((li) => li.materialCode === "REBAR_16MM");
    const totalLine = result.find((li) => li.materialCode === "REBAR_TONNAGE");

    expect(barLine!.quantity).toBeCloseTo(60, 1);
    expect(totalLine!.quantity).toBeCloseTo(0.0996, 3);
  });

  it("groups schedules by diameter and sorts ascending", () => {
    const schedules: RebarSchedule[] = [
      { id: "r1", elementId: "c1", diameterMm: 16, lengthM: 3, quantity: 4 },
      { id: "r2", elementId: "c2", diameterMm: 12, lengthM: 2, quantity: 5 },
      { id: "r3", elementId: "c1", diameterMm: 12, lengthM: 1, quantity: 2 },
    ];
    const result = calculateReinforcement(schedules);
    const barLines = result.filter((li) => li.materialCode?.startsWith("REBAR_") && li.materialCode !== "REBAR_TONNAGE");

    expect(barLines.map((li) => li.materialCode)).toEqual(["REBAR_12MM", "REBAR_16MM"]);
    // Y12mm total length = 2*5 + 1*2 = 12m (merged across both schedule rows).
    expect(barLines[0].quantity).toBeCloseTo(12, 1);
  });
});
