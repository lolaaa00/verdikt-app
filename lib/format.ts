/**
 * Format wei string to human-readable GEN with decimals.
 * All on-chain values use 18 decimals.
 */
export function formatGEN(weiStr: string | bigint, decimals = 2): string {
  const wei = BigInt(weiStr);
  const whole = wei / BigInt(10 ** 18);
  const remainder = wei % BigInt(10 ** 18);

  if (decimals === 0) return whole.toString();

  const fracStr = remainder.toString().padStart(18, "0").slice(0, decimals);
  const formatted = `${whole}.${fracStr}`;

  // Remove trailing zeros but keep at least one decimal
  return formatted.replace(/\.?0+$/, "") || "0";
}

/**
 * Format GEN for display with unit suffix (K, M).
 */
export function formatGENCompact(weiStr: string | bigint): string {
  const gen = Number(formatGEN(weiStr, 4));
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(1)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(1)}K GEN`;
  if (gen >= 1) return `${gen.toFixed(2)} GEN`;
  if (gen > 0) return `${gen.toFixed(4)} GEN`;
  return "0 GEN";
}

/**
 * Parse user input string to wei bigint.
 * e.g. "1.5" → 1500000000000000000n
 */
export function parseGENToWei(input: string): bigint {
  if (!input || input === "0") return BigInt(0);

  const parts = input.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(18, "0").slice(0, 18);

  return BigInt(whole + frac);
}

/**
 * Format unix seconds timestamp to readable date.
 */
export function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Calculate odds percentages from wei pool strings.
 */
export function calcOddsFromWei(poolA: string, poolB: string): { oddsA: number; oddsB: number } {
  const a = BigInt(poolA || "0");
  const b = BigInt(poolB || "0");
  const total = a + b;
  if (total === BigInt(0)) return { oddsA: 50, oddsB: 50 };
  const oddsA = Number((a * BigInt(100)) / total);
  const oddsB = 100 - oddsA;
  return { oddsA, oddsB };
}
