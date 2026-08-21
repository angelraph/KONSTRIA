import { describe, expect, it } from "vitest";
import { isOutlier, median } from "./outlier.js";

describe("isOutlier", () => {
  it("flags a value far outside the IQR fence", () => {
    // Hand-verified: sorted [10,11,12,12,13]. Q1(pos=1)=11, Q3(pos=3)=12, IQR=1.
    // Fences = [11-1.5, 12+1.5] = [9.5, 13.5]. 50 is far above 13.5.
    expect(isOutlier(50, [10, 12, 11, 13, 12])).toBe(true);
  });

  it("does not flag a value within the IQR fence", () => {
    expect(isOutlier(12.5, [10, 12, 11, 13, 12])).toBe(false);
  });

  it("never flags when there isn't enough history to judge", () => {
    expect(isOutlier(1000, [10, 11])).toBe(false);
  });
});

describe("median", () => {
  it("computes the median of an odd-length array", () => {
    expect(median([10, 11, 12, 12, 13])).toBe(12);
  });
});
