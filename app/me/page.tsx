"use client";
import { useState, useEffect, useRef } from "react";
import Footer from "@/components/layout/Footer";
import { VerdiktConfirmedBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";

type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  markets_entered: number;
  correct_predictions: number;
  total_staked: number;
  total_won: number;
  win_rate: number;
};

const BADGES = [
  { icon: "🎯", name: "Sharp Eye",     desc: "10 correct predictions" },
  { icon: "⚡", name: "Early Entry",   desc: "First 10 on 5 markets" },
  { icon: "🔥", name: "Streak x3",     desc: "3 wins in a row" },
  { icon: "💎", name: "Big Upset",     desc: "Won a <20% odds call" },
];

export default function ProfilePage() {
  const { isConnected, address, connect } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [positions, _setPositions] = useState<Array<{
    id: string; market: string; side: string; amount: number;
    payout: number | null; status: string; outcome: string | null;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile on wallet connect
  useEffect(() => {
    if (!isConnected || !address) return;
    setLoading(true);
    fetch(`/api/profile?wallet=${address}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setEditName(data.user.display_name || "");
          setEditAvatar(data.user.avatar_url || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isConnected, address]);

  async function handleSave() {
    if (!address) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          display_name: editName || null,
          avatar_url: editAvatar || null,
        }),
      });
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
        setEditing(false);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to base64 data URL for simple avatar storage
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setEditAvatar(result);
    };
    reader.readAsDataURL(file);
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-surface-card border border-subtle flex items-center justify-center mx-auto">
            <span className="text-3xl">👤</span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
            Connect Your Wallet
          </h1>
          <p className="text-secondary text-sm">
            Connect your wallet to view your profile, track positions, and manage your VERDIKT identity.
          </p>
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
          <p className="text-muted text-xs font-mono">
            Don&apos;t have GEN tokens?{" "}
            <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" className="text-lime hover:text-lime-hover">
              Claim from Studio →
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted text-sm font-mono">Loading profile…</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.display_name || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Anonymous");
  const avatarUrl = profile?.avatar_url;
  const stats = {
    marketsEntered: profile?.markets_entered ?? 0,
    correctPredictions: profile?.correct_predictions ?? 0,
    winRate: profile?.win_rate ?? 0,
    totalStaked: profile?.total_staked ?? 0,
    totalWon: profile?.total_won ?? 0,
  };

  return (
    <div className="pt-16">
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative group">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-16 h-16 rounded-full border border-active object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-raised border border-active flex items-center justify-center text-2xl font-mono font-bold text-lime">
                  {displayName[0]?.toUpperCase() || "?"}
                </div>
              )}
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-white text-xs font-mono">Edit</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>

            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted font-mono block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter display name"
                      className="bg-surface-soft border border-default rounded-lg px-3 py-2 text-white text-sm font-mono w-full max-w-xs focus:outline-none focus:border-active transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted font-mono block mb-1">Avatar URL (or upload above)</label>
                    <input
                      type="text"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="https://..."
                      className="bg-surface-soft border border-default rounded-lg px-3 py-2 text-white text-sm font-mono w-full max-w-xs focus:outline-none focus:border-active transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
                      {displayName}
                    </h1>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs font-mono text-muted hover:text-lime transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                  <p className="text-muted text-xs font-mono mt-1">{address}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <VerdiktConfirmedBadge />
                    <span className="text-[10px] font-mono text-lime/50 px-2 py-1 rounded border border-lime/10 bg-lime-soft">
                      Connected
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Markets Entered",    value: stats.marketsEntered },
            { label: "Correct Predictions", value: stats.correctPredictions },
            { label: "Win Rate",            value: `${stats.winRate}%` },
            { label: "Total Staked",        value: `${stats.totalStaked.toLocaleString()} GEN` },
            { label: "Total Won",           value: `${stats.totalWon.toLocaleString()} GEN` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-card border border-subtle rounded-xl p-4">
              <div className="text-muted text-xs font-mono mb-1">{label}</div>
              <div className="text-xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-sm font-bold text-white mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {BADGES.map((b) => (
              <div key={b.name} className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-card border border-subtle rounded-xl card-hover">
                <span className="text-xl">{b.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{b.name}</div>
                  <div className="text-[11px] text-muted font-mono">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active positions */}
        <div>
          <h2 className="text-sm font-bold text-white mb-4">Active Positions</h2>
          <div className="bg-surface-card border border-subtle rounded-xl overflow-hidden">
            {positions.filter((p) => p.status === "open").length === 0 ? (
              <div className="text-center py-8 text-muted font-mono text-sm">
                No active positions.{" "}
                <Link href="/arena" className="text-lime hover:text-lime-hover">Enter the Arena →</Link>
              </div>
            ) : (
              positions.filter((p) => p.status === "open").map((p, i, arr) => (
                <div key={p.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-subtle" : ""}`}>
                  <div>
                    <div className="text-sm font-medium text-white">{p.market}</div>
                    <div className="text-xs font-mono text-lime mt-0.5">{p.side}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-white">{p.amount} GEN</div>
                    <div className="text-[11px] font-mono text-muted">staked</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settlement history */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Settlement History</h2>
            <Link href="/history" className="text-xs text-lime hover:text-lime-hover font-mono">View all →</Link>
          </div>
          <div className="bg-surface-card border border-subtle rounded-xl overflow-hidden">
            {positions.filter((p) => p.status === "settled").length === 0 ? (
              <div className="text-center py-8 text-muted font-mono text-sm">
                No settled positions yet.
              </div>
            ) : (
              positions.filter((p) => p.status === "settled").map((p, i, arr) => (
                <div key={p.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-subtle" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${p.outcome === "won" ? "bg-lime" : "bg-danger"}`} />
                    <div>
                      <div className="text-sm font-medium text-white">{p.market}</div>
                      <div className="text-xs font-mono text-muted mt-0.5">{p.side}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${p.outcome === "won" ? "text-lime" : "text-danger"}`}>
                      {p.outcome === "won" ? `+${p.payout} GEN` : `-${p.amount} GEN`}
                    </div>
                    <div className="text-[11px] font-mono text-muted capitalize">{p.outcome}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
