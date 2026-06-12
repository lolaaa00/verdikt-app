"use client";
import { formatGENCompact, calcOddsFromWei } from "@/lib/format";

interface OddsBarProps {
  sideA: string;
  sideB: string;
  poolA: string; // wei
  poolB: string; // wei
}

export default function OddsBar({ sideA, sideB, poolA, poolB }: OddsBarProps) {
  const { oddsA, oddsB } = calcOddsFromWei(poolA, poolB);
  const totalWei = BigInt(poolA || "0") + BigInt(poolB || "0");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-white">{sideA}</span>
        <span className="text-white">{sideB}</span>
      </div>

      <div className="relative h-3 rounded-full bg-surface-soft overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-lime rounded-l-full transition-all duration-700 ease-out"
          style={{ width: `${oddsA}%` }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-surface-raised rounded-r-full transition-all duration-700 ease-out"
          style={{ width: `${oddsB}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex flex-col gap-0.5">
          <span className="text-lime font-bold text-sm">{oddsA}%</span>
          <span className="text-muted">{formatGENCompact(poolA)} staked</span>
        </div>
        <div className="text-center">
          <span className="text-muted text-[11px]">Total Pool</span>
          <p className="text-white font-bold">{formatGENCompact(totalWei.toString())}</p>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span className="text-secondary font-bold text-sm">{oddsB}%</span>
          <span className="text-muted">{formatGENCompact(poolB)} staked</span>
        </div>
      </div>
    </div>
  );
}
