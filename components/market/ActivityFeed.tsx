"use client";

interface ActivityFeedProps {
  sideA: string;
  sideB: string;
}

export default function ActivityFeed({ sideA: _sideA, sideB: _sideB }: ActivityFeedProps) {
  return (
    <div className="bg-surface-card border border-subtle rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-semibold text-white">Recent Activity</h4>
      <p className="text-muted text-sm font-mono text-center py-4">
        Activity feed coming soon. All bets are recorded on-chain.
      </p>
    </div>
  );
}
