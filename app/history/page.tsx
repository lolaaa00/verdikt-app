"use client";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { useWallet } from "@/contexts/WalletContext";
import { useContract } from "@/hooks/useContract";
import { ContractMarket, UserPosition, QuotePayout } from "@/types";
import { formatGEN, formatTimestamp } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";

type PositionEntry = {
  market: ContractMarket;
  position: UserPosition;
  payout: QuotePayout | null;
};

const FILTER_TABS = [
  { key: "all",     label: "All" },
  { key: "active",  label: "Active" },
  { key: "claimable", label: "Claimable" },
  { key: "history", label: "Settled" },
];

export default function HistoryPage() {
  const { isConnected, address, connect } = useWallet();
  const { getAllMarkets, getUserPosition, quotePayout, claim } = useContract();

  const [entries, setEntries] = useState<PositionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    if (!isConnected || !address) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      try {
        const markets = await getAllMarkets();
        const results: PositionEntry[] = [];

        for (const m of markets) {
          const pos = await getUserPosition(m.id, address);
          if (!pos) continue;
          const hasStake = BigInt(pos.stake_a || "0") > BigInt(0) || BigInt(pos.stake_b || "0") > BigInt(0);
          if (!hasStake) continue;

          let pay: QuotePayout | null = null;
          if (m.status === "RESOLVED" || m.status === "CANCELLED") {
            pay = await quotePayout(m.id, address);
          }
          results.push({ market: m, position: pos, payout: pay });
        }

        setEntries(results);
      } catch {}
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  async function handleClaim(marketId: number) {
    setClaiming(marketId);
    try {
      await claim(marketId);
      // Refresh
      if (address) {
        const pay = await quotePayout(marketId, address);
        setEntries(prev => prev.map(e => e.market.id === marketId ? { ...e, payout: pay } : e));
      }
    } catch {}
    setClaiming(null);
  }

  const filtered = entries.filter((e) => {
    if (filter === "active") {
      return (
        e.market.status === "ACTIVE" ||
        e.market.status === "PENDING_LIQUIDITY" ||
        e.market.status === "CLOSED" ||
        e.market.status === "AWAITING_RESOLUTION" ||
        e.market.status === "UNDER_RESOLUTION" ||
        e.market.status === "UNRESOLVED"
      );
    }
    if (filter === "claimable") return e.payout && BigInt(e.payout.claimable || "0") > BigInt(0);
    if (filter === "history") return e.market.status === "RESOLVED" || e.market.status === "CANCELLED";
    return true;
  });

  if (!isConnected) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
          <p className="text-secondary text-sm">Connect your wallet to view your positions.</p>
          <Button onClick={connect}>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
            My Positions
          </h1>
          <p className="text-secondary mt-2 text-sm">Your bets across all markets, read from the contract.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Tabs tabs={FILTER_TABS} active={filter} onChange={setFilter} />

        {loading ? (
          <div className="text-center py-20 text-muted font-mono text-sm animate-pulse">Loading positions from contract...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-card border border-subtle rounded-xl p-12 text-center">
            <p className="text-muted font-mono text-sm">
              {entries.length === 0 ? "No positions yet. Place a bet in the Arena." : "No positions match this filter."}
            </p>
          </div>
        ) : (
          <div className="bg-surface-card border border-subtle rounded-xl overflow-hidden">
            {filtered.map((e, i) => {
              const stakeA = BigInt(e.position.stake_a || "0");
              const stakeB = BigInt(e.position.stake_b || "0");
              const claimable = e.payout ? BigInt(e.payout.claimable || "0") : BigInt(0);

              return (
                <div key={e.market.id} className={`px-5 py-4 ${i < filtered.length - 1 ? "border-b border-subtle" : ""} hover:bg-surface-soft transition-colors`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={e.market.status} />
                      </div>
                      <a href={`/arena/${e.market.id}`} className="font-medium text-white hover:text-lime transition-colors">
                        {e.market.title}
                      </a>
                      <div className="text-[11px] font-mono text-muted mt-1">
                        Close: {formatTimestamp(e.market.close_ts)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {stakeA > BigInt(0) && (
                        <div className="text-xs font-mono">
                          <span className="text-lime">{e.market.side_a}: </span>
                          <span className="text-white font-bold">{formatGEN(e.position.stake_a)} GEN</span>
                        </div>
                      )}
                      {stakeB > BigInt(0) && (
                        <div className="text-xs font-mono">
                          <span className="text-secondary">{e.market.side_b}: </span>
                          <span className="text-white font-bold">{formatGEN(e.position.stake_b)} GEN</span>
                        </div>
                      )}
                      {claimable > BigInt(0) && (
                        <div className="text-xs font-mono text-lime font-bold mt-1">
                          Claimable: {formatGEN(e.payout!.claimable)} GEN
                        </div>
                      )}
                      {e.payout && e.payout.reason && (
                        <div className="text-[10px] font-mono text-muted">{e.payout.reason}</div>
                      )}
                    </div>
                  </div>

                  {claimable > BigInt(0) && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleClaim(e.market.id)}
                        loading={claiming === e.market.id}
                      >
                        Claim {formatGEN(e.payout!.claimable)} GEN
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
