import { MarketStatus } from "@/types";

const STATUS_STYLES: Record<MarketStatus, string> = {
  PENDING_LIQUIDITY: "bg-gold/10  text-gold   border-gold/25",
  ACTIVE:           "bg-lime-soft text-lime   border-lime/20",
  CLOSED:           "bg-white/5  text-white  border-white/10",
  AWAITING_RESOLUTION: "bg-gold/10 text-gold border-gold/25",
  UNDER_RESOLUTION: "bg-white/5 text-white border-white/10",
  RESOLVED:         "bg-lime-soft text-lime   border-lime/30",
  UNRESOLVED:       "bg-danger/10 text-danger border-danger/25",
  CANCELLED:        "bg-white/[0.03] text-[#666] border-white/[0.06]",
};

const STATUS_DOT: Record<MarketStatus, string> = {
  PENDING_LIQUIDITY: "bg-gold animate-pulse",
  ACTIVE:           "bg-lime",
  CLOSED:           "bg-white",
  AWAITING_RESOLUTION: "bg-gold animate-pulse",
  UNDER_RESOLUTION: "bg-white animate-pulse",
  RESOLVED:         "bg-lime",
  UNRESOLVED:       "bg-danger",
  CANCELLED:        "bg-[#666]",
};

const STATUS_LABEL: Record<MarketStatus, string> = {
  PENDING_LIQUIDITY: "WAITING FOR BOTH SIDES",
  ACTIVE:           "LIVE",
  CLOSED:           "CLOSED",
  AWAITING_RESOLUTION: "READY TO RESOLVE",
  UNDER_RESOLUTION: "GENLAYER RESOLVING",
  RESOLVED:         "RESOLVED",
  UNRESOLVED:       "UNRESOLVED",
  CANCELLED:        "CANCELLED",
};

export function StatusBadge({ status }: { status: MarketStatus | string }) {
  const s = status as MarketStatus;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold tracking-badge ${STATUS_STYLES[s] || "bg-white/5 text-white border-white/10"}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s] || "bg-white"}`} />
      {STATUS_LABEL[s] || status}
    </span>
  );
}

export function VerdiktConfirmedBadge() {
  return (
    <span className="verdikt-confirmed inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lime bg-bg">
      <span className="text-lime font-mono text-xs">▶</span>
      <span className="text-lime font-mono text-xs font-bold tracking-badge uppercase">Verdikt Confirmed</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-mono text-muted bg-surface-soft border border-subtle uppercase tracking-widest">
      {category}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    HIGH:   "text-lime   border-lime/30   bg-lime-soft",
    MEDIUM: "text-gold   border-gold/30   bg-gold/10",
    LOW:    "text-danger border-danger/30 bg-danger/10",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-bold tracking-badge ${map[confidence] ?? ""}`}>
      {confidence}
    </span>
  );
}

export function SuggestionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUGGESTED: "bg-gold/20 text-gold",
    APPROVED:  "bg-lime/20 text-lime",
    REJECTED:  "bg-danger/20 text-danger",
  };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${styles[status] || "bg-white/10 text-white"}`}>
      {status}
    </span>
  );
}
