import { describe, expect, it } from "vitest";
import { pxPerMetre } from "./extraction.js";

describe("pxPerMetre", () => {
  it("derives px/m from a 3-4-5 triangle calibration line", () => {
    // Hand-verified: distance between (0,0) and (300,400) = sqrt(300^2+400^2)
    // = sqrt(90000+160000) = sqrt(250000) = 500px. Real length 5m -> 100 px/m.
    const result = pxPerMetre({
      pointAPx: [0, 0],
      pointBPx: [300, 400],
      realWorldLengthM: 5,
    });
    expect(result).toBe(100);
  });
});
