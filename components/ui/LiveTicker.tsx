"use client";

const ITEMS = [
  { market: "Arsenal vs Chelsea", side: "Arsenal Win or Draw", conf: "HIGH" },
  { market: "ETH $4,000 milestone", side: "Yes — ETH reached $4,000", conf: "HIGH" },
  { market: "GenLayer Q3 Mainnet", side: "No announcement yet", conf: "MEDIUM" },
  { market: "Lakers vs Warriors", side: "Warriors Win", conf: "HIGH" },
  { market: "BTC $70k this week?", side: "No — BTC stayed below", conf: "MEDIUM" },
  { market: "Worlds 2025 Champion", side: "T1 wins Worlds", conf: "HIGH" },
  { market: "US CPI < 3% in June?", side: "Yes — CPI dropped", conf: "MEDIUM" },
];

export default function LiveTicker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y border-subtle bg-surface py-2.5">
      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2.5 px-5 text-xs font-mono">
            <span className="text-lime/50 text-[10px]">▶</span>
            <span className="text-secondary">{item.market}</span>
            <span className="text-muted">→</span>
            <span className="text-white font-semibold">{item.side}</span>
            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-badge ${
              item.conf === "HIGH" ? "border-lime/25 text-lime/70" : "border-gold/25 text-gold/70"
            }`}>{item.conf}</span>
            <span className="text-white/10 px-3">│</span>
          </span>
        ))}
      </div>
    </div>
  );
}
