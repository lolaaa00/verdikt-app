"use client";
import Link from "next/link";
import { ContractMarket } from "@/types";
import { StatusBadge } from "@/components/ui/Badge";
import MarketCountdown from "@/components/ui/MarketCountdown";
import { formatGENCompact, calcOddsFromWei } from "@/lib/format";

export default function MarketCard({ market }: { market: ContractMarket }) {
  const { oddsA, oddsB } = calcOddsFromWei(market.pool_a, market.pool_b);
  const totalWei = BigInt(market.pool_a || "0") + BigInt(market.pool_b || "0");
  const isResolved = market.status === "RESOLVED";
  const isCancelled = market.status === "CANCELLED";
  const isPendingResolution =
    market.status === "CLOSED" ||
    market.status === "AWAITING_RESOLUTION" ||
    market.status === "UNDER_RESOLUTION" ||
    market.status === "UNRESOLVED";
  const canBet = (market.status === "PENDING_LIQUIDITY" || market.status === "ACTIVE") &&
    market.close_ts * 1000 > Date.now();

  return (
    <Link href={`/arena/${market.id}`}>
      <article className="bg-surface-card border border-subtle rounded-xl p-5 card-hover group flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge status={market.status} />
          {canBet && (
            <MarketCountdown deadline={new Date(market.close_ts * 1000).toISOString()} />
          )}
        </div>

        <h3 className="font-semibold text-white leading-snug" style={{ letterSpacing: "-0.01em" }}>
          {market.title}
        </h3>

        {isResolved && market.winner && (
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime shrink-0" />
            <span className="text-sm font-semibold text-white">
              {market.winner === "A" ? market.side_a : market.winner === "B" ? market.side_b : "Voided"}
            </span>
          </div>
        )}

        {isCancelled && (
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#666] shrink-0" />
            <span className="text-sm text-muted">Cancelled - refunds available</span>
          </div>
        )}

        {isPendingResolution && !isResolved && !isCancelled && (
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
            <span className="text-sm text-muted">
              {market.status === "UNRESOLVED"
                ? "Evidence was inconclusive - retry resolution later"
                : "Awaiting permissionless GenLayer resolution"}
            </span>
          </div>
        )}

        {!isResolved && !isCancelled && !isPendingResolution && (
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/90 font-medium truncate max-w-[44%]">{market.side_a}</span>
              <span className="text-white/90 font-medium truncate max-w-[44%] text-right">{market.side_b}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
              <div className="h-full bg-lime rounded-full transition-all duration-700 ease-out" style={{ width: `${oddsA}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-lime font-bold">{oddsA}%</span>
              <span className="text-secondary font-bold">{oddsB}%</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-subtle">
          <span className="text-xs font-mono text-muted">
            {formatGENCompact(totalWei.toString())} <span className="text-muted/50">pool</span>
          </span>
          <span className="text-xs text-lime/70 font-medium group-hover:text-lime transition-colors">
            {canBet ? "Place bet ->" : "View ->"}
          </span>
        </div>
      </article>
    </Link>
  );
}
