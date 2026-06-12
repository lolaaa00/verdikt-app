"use client";
import { useState, useEffect } from "react";
import { ContractMarket } from "@/types";
import { StatusBadge } from "@/components/ui/Badge";
import OddsBar from "@/components/market/OddsBar";
import PositionPanel from "@/components/market/PositionPanel";
import Footer from "@/components/layout/Footer";
import { useContract } from "@/hooks/useContract";
import { formatTimestamp } from "@/lib/format";

export default function MarketDetailPage({ params }: { params: { marketId: string } }) {
  const [market, setMarket] = useState<ContractMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const { getMarket } = useContract();

  useEffect(() => {
    const id = parseInt(params.marketId, 10);
    if (isNaN(id)) {
      setLoading(false);
      return;
    }
    getMarket(id)
      .then(setMarket)
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.marketId]);

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-muted font-mono text-sm animate-pulse">Loading market...</div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Market Not Found</h2>
          <a href="/arena" className="text-lime text-sm hover:text-lime-hover">Back to Arena -&gt;</a>
        </div>
      </div>
    );
  }

  let sources: string[] = [];
  try {
    sources = JSON.parse(market.resolution_sources);
  } catch {
    if (market.resolution_sources) sources = [market.resolution_sources];
  }

  return (
    <div className="pt-16">
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-3 text-xs font-mono text-muted flex items-center gap-2">
          <a href="/arena" className="hover:text-lime transition-colors">Arena</a>
          <span>/</span>
          <span className="text-secondary truncate">{market.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={market.status} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
                {market.title}
              </h1>
              <div className="text-xs font-mono text-muted">
                Close time: {formatTimestamp(market.close_ts)}
              </div>
              {market.resolution_available_ts > 0 && (
                <div className="text-xs font-mono text-muted">
                  Evidence available after: {formatTimestamp(market.resolution_available_ts)}
                </div>
              )}
            </div>

            <div className="bg-surface-card border border-subtle rounded-xl p-5">
              <OddsBar
                sideA={market.side_a}
                sideB={market.side_b}
                poolA={market.pool_a}
                poolB={market.pool_b}
              />
            </div>

            <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-4">
              <h4 className="font-semibold text-white">Resolution Rule</h4>

              {market.resolution_question && (
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Resolution Question</p>
                  <p className="text-secondary text-sm leading-relaxed">{market.resolution_question}</p>
                </div>
              )}

              <p className="text-secondary text-sm leading-relaxed">{market.resolution_rule}</p>

              {market.void_conditions && (
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Void Conditions</p>
                  <p className="text-secondary text-sm leading-relaxed">{market.void_conditions}</p>
                </div>
              )}

              {sources.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Resolution Sources</p>
                  <div className="space-y-1.5">
                    {sources.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono text-muted">
                        <span className="text-lime/50">-&gt;</span>
                        <span className="truncate">{url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {market.status === "RESOLVED" && market.winner && (
                <div className="bg-lime-soft border border-lime/20 rounded-lg p-4 space-y-2">
                  <div className="text-xs font-mono text-muted">Verdict</div>
                  <div className="text-lime font-bold text-lg">
                    {market.winner === "A" ? market.side_a : market.winner === "B" ? market.side_b : "Voided - All refunded"}
                  </div>
                  {market.resolution_details?.reasoning && (
                    <p className="text-secondary text-sm">{market.resolution_details.reasoning}</p>
                  )}
                  {market.resolution_details?.evidence_summary?.map((item, index) => (
                    <p key={index} className="text-secondary text-sm">{item}</p>
                  ))}
                  {market.resolution_note && (
                    <p className="text-secondary text-sm">{market.resolution_note}</p>
                  )}
                </div>
              )}

              {market.status === "UNRESOLVED" && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-secondary text-sm">
                    GenLayer could not determine a fair winner from the current evidence yet. Anyone can retry resolution later when the sources become clearer.
                  </p>
                </div>
              )}

              {market.status === "CANCELLED" && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-secondary text-sm">
                    This market was cancelled. All participants can claim full refunds.
                  </p>
                </div>
              )}
            </div>

            {(market.status === "PENDING_LIQUIDITY" || market.status === "ACTIVE") && (
              <div className="bg-surface-card border border-subtle rounded-xl p-5 space-y-2">
                <h4 className="text-sm font-semibold text-white">How Payouts Work</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  This is a parimutuel market. Winners share the entire losing pool minus protocol fee.
                  If only one side has bets by close time, the market is automatically cancelled and everyone gets refunded.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <PositionPanel market={market} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
