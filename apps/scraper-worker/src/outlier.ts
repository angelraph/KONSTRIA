/**
 * Flags a new price as an outlier against a set of recent, already-accepted
 * amounts for the same (material, region), using an IQR fence — the
 * standard robust-outlier method, insensitive to a handful of already-bad
 * historical points the way a plain mean/stddev check wouldn't be.
 */
export function isOutlier(newAmount: number, recentAmounts: number[]): boolean {
  if (recentAmounts.length < 3) return false; // not enough history to judge

  const sorted = [...recentAmounts].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  if (iqr === 0) {
    // No spread in recent history at all — flag anything that isn't equal.
    return newAmount !== q1;
  }

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  return newAmount < lowerFence || newAmount > upperFence;
}

function quantile(sortedValues: number[], q: number): number {
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}
