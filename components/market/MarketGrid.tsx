"use client";
import { useState, useMemo } from "react";
import { ContractMarket } from "@/types";
import MarketCard from "./MarketCard";
import Tabs from "@/components/ui/Tabs";
import Input from "@/components/ui/Input";

const STATUS_TABS = [
  { key: "active",   label: "Active" },
  { key: "closed",   label: "Closed" },
  { key: "resolved", label: "Resolved" },
  { key: "all",      label: "All" },
];

export default function MarketGrid({ markets }: { markets: ContractMarket[] }) {
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let m = markets;

    if (tab === "active") {
      m = m.filter((x) => x.status === "PENDING_LIQUIDITY" || x.status === "ACTIVE");
    } else if (tab === "closed") {
      m = m.filter((x) =>
        x.status === "CLOSED" ||
        x.status === "AWAITING_RESOLUTION" ||
        x.status === "UNDER_RESOLUTION" ||
        x.status === "UNRESOLVED"
      );
    } else if (tab === "resolved") {
      m = m.filter((x) => x.status === "RESOLVED" || x.status === "CANCELLED");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      m = m.filter((x) =>
        x.title.toLowerCase().includes(q) ||
        x.side_a.toLowerCase().includes(q) ||
        x.side_b.toLowerCase().includes(q)
      );
    }

    // Sort: active first by close time, resolved by id desc
    return [...m].sort((a, b) => {
      if (tab === "active") return a.close_ts - b.close_ts;
      return b.id - a.id;
    });
  }, [markets, tab, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs tabs={STATUS_TABS} active={tab} onChange={setTab} />
        <div className="ml-auto w-full sm:w-auto">
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted font-mono text-sm">
          No markets yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => <MarketCard key={m.id} market={m} />)}
        </div>
      )}
    </div>
  );
}
