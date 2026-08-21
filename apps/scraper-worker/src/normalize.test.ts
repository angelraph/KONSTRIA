import { describe, expect, it } from "vitest";
import { resolveMaterialCode } from "./normalize.js";

const catalog = [
  { code: "CEMENT_50KG_BAG", aliases: ["cement", "dangote cement", "50kg cement bag"] },
  { code: "BLOCK_225MM", aliases: ["9 inch block", "9inch block"] },
];

describe("resolveMaterialCode", () => {
  it("matches an exact alias regardless of case/punctuation", () => {
    expect(resolveMaterialCode("Dangote Cement", catalog)).toBe("CEMENT_50KG_BAG");
  });

  it("matches via substring containment when unambiguous", () => {
    expect(resolveMaterialCode("9inch block for sale, Lekki", catalog)).toBe("BLOCK_225MM");
  });

  it("returns null (defer to human review) when nothing matches", () => {
    expect(resolveMaterialCode("roofing nails 4 inch", catalog)).toBeNull();
  });
});
