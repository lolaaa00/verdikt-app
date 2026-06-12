import { calcOddsFromWei } from "@/lib/format";

interface OddsDisplayProps {
  sideA: string;
  sideB: string;
  poolA: string; // wei
  poolB: string; // wei
  compact?: boolean;
}

export default function OddsDisplay({ sideA, sideB, poolA, poolB, compact }: OddsDisplayProps) {
  const { oddsA, oddsB } = calcOddsFromWei(poolA, poolB);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-lime font-bold">{oddsA}%</span>
        <span className="text-muted text-[10px]">vs</span>
        <span className="text-secondary font-bold">{oddsB}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/90 font-medium truncate max-w-[44%]">{sideA}</span>
        <span className="text-white/90 font-medium truncate max-w-[44%] text-right">{sideB}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
        <div
          className="h-full bg-lime rounded-full transition-all duration-700 ease-out"
          style={{ width: `${oddsA}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-lime font-bold">{oddsA}%</span>
        <span className="text-muted text-[10px]">pool odds</span>
        <span className="text-secondary font-bold">{oddsB}%</span>
      </div>
    </div>
  );
}
