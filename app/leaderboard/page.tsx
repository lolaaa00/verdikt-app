"use client";
import Footer from "@/components/layout/Footer";

export default function LeaderboardPage() {
  return (
    <div className="pt-16">
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
            Leaderboard
          </h1>
          <p className="text-secondary mt-2 text-sm">
            Rankings computed from on-chain positions. Coming soon.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-surface-card border border-subtle rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-lg font-bold text-white mb-2">Leaderboard Coming Soon</h3>
          <p className="text-muted text-sm font-mono max-w-md mx-auto">
            Once markets start resolving, the leaderboard will rank players by their on-chain wins. Place bets now to be among the first.
          </p>
          <a href="/arena" className="inline-block mt-6 px-6 py-3 bg-lime text-black font-bold rounded-lg text-sm hover:bg-lime-hover transition-all">
            Enter Arena →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
