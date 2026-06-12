"use client";
import { useState, useEffect } from "react";
import { ContractMarket } from "@/types";
import MarketGrid from "@/components/market/MarketGrid";
import Footer from "@/components/layout/Footer";
import { useContract } from "@/hooks/useContract";

export default function ArenaPage() {
  const [markets, setMarkets] = useState<ContractMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAllMarkets } = useContract();

  useEffect(() => {
    getAllMarkets()
      .then(setMarkets)
      .catch((e) => console.error("Failed to load markets:", e))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllMarkets]);

  return (
    <div className="pt-16">
      {/* Header */}
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-xs font-mono text-lime tracking-badge uppercase">On-Chain Markets</span>
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
            The Arena
          </h1>
          <p className="text-secondary mt-2 text-sm">
            {loading ? "Loading..." : `${markets.length} markets · GenLayer-settled · Parimutuel pools`}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-muted font-mono text-sm animate-pulse">Loading markets from contract...</div>
        ) : (
          <MarketGrid markets={markets} />
        )}
      </div>

      <Footer />
    </div>
  );
}
