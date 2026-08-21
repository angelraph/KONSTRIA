export interface CanonicalMaterialAliasEntry {
  code: string;
  aliases: string[];
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Resolves free-text listing titles (e.g. a Jiji.ng ad title like "9inch
 * blocks for sale, Lekki") to a MaterialCanonical code via exact-alias
 * match, falling back to substring containment. Returns null when nothing
 * matches confidently — callers MUST route a null result to the admin Match
 * Queue rather than guessing, per the price-sourcing design (no silent
 * misclassification).
 */
export function resolveMaterialCode(
  rawText: string,
  catalog: CanonicalMaterialAliasEntry[]
): string | null {
  const normalized = normalizeText(rawText);

  for (const entry of catalog) {
    for (const alias of entry.aliases) {
      if (normalizeText(alias) === normalized) return entry.code;
    }
  }

  const substringMatches = catalog.filter((entry) =>
    entry.aliases.some((alias) => normalized.includes(normalizeText(alias)))
  );

  // Ambiguous (multiple materials' aliases appear in the text) -> defer to
  // a human rather than guessing which one is meant.
  if (substringMatches.length === 1) return substringMatches[0].code;
  return null;
}
