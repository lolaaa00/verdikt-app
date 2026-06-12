"use client";

const VALIDATORS = 5;

export default function ConsensusIndicator({ reached = true }: { reached?: boolean }) {
  return (
    <div className="bg-surface-card border border-subtle rounded-xl p-5 space-y-3">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${reached ? "bg-lime animate-pulse" : "bg-muted"}`} />
        Validator Consensus
      </h4>
      <div className="flex items-center gap-2">
        {Array.from({ length: VALIDATORS }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all ${
              reached ? "bg-lime" : i < 2 ? "bg-lime" : "bg-surface-raised"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <p className="text-xs font-mono text-muted">
        {reached
          ? `${VALIDATORS}/${VALIDATORS} validators reached consensus via Equivalence Principle`
          : "Consensus pending…"}
      </p>
    </div>
  );
}
