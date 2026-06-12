"use client";
import { useState, useEffect } from "react";
import { ContractMarket, UserPosition, QuotePayout } from "@/types";
import Button from "@/components/ui/Button";
import { useWallet } from "@/contexts/WalletContext";
import { useContract } from "@/hooks/useContract";
import { formatGEN, parseGENToWei, calcOddsFromWei } from "@/lib/format";
import { getExplorerTxUrl } from "@/lib/genlayer/config";

export default function PositionPanel({ market }: { market: ContractMarket }) {
  const [side, setSide] = useState<"A" | "B" | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [payout, setPayout] = useState<QuotePayout | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [resolving, setResolving] = useState(false);

  const { isConnected, address, connect } = useWallet();
  const { placeBet, claim, triggerResolution, getUserPosition, quotePayout, txState } = useContract();

  const canBet = (market.status === "PENDING_LIQUIDITY" || market.status === "ACTIVE") &&
    market.close_ts * 1000 > Date.now();
  const canClaim = market.status === "RESOLVED" || market.status === "CANCELLED";
  const canTriggerResolution =
    (market.status === "CLOSED" || market.status === "AWAITING_RESOLUTION" || market.status === "UNRESOLVED") &&
    market.close_ts * 1000 <= Date.now();

  const { oddsA, oddsB } = calcOddsFromWei(market.pool_a, market.pool_b);

  useEffect(() => {
    if (!isConnected || !address) return;
    getUserPosition(market.id, address).then(setPosition);
    if (canClaim) {
      quotePayout(market.id, address).then(setPayout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.id, address, isConnected, market.status]);

  async function handleBet() {
    if (!side || !amount || Number(amount) <= 0) return;
    if (!isConnected) {
      connect();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const valueWei = parseGENToWei(amount);
      if (valueWei <= BigInt(0)) throw new Error("Amount must be positive");

      const hash = await placeBet(market.id, side, valueWei);
      setTxHash(hash);
      setSuccess(true);
      setAmount("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    setError("");
    try {
      const hash = await claim(market.id);
      setTxHash(hash);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  async function handleTriggerResolution() {
    if (!isConnected) {
      connect();
      return;
    }

    setResolving(true);
    setError("");
    try {
      const hash = await triggerResolution(market.id);
      setTxHash(hash);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Resolution failed");
    } finally {
      setResolving(false);
    }
  }

  if (success) {
    return (
      <div className="bg-surface-card border border-lime/20 rounded-xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-lime/10 border border-lime/30 flex items-center justify-center mx-auto">
          <span className="text-lime text-xl">OK</span>
        </div>
        <h3 className="font-bold text-white">Transaction Confirmed</h3>
        <p className="text-secondary text-sm">Your transaction has been recorded on-chain.</p>
        {txHash && (
          <a
            href={getExplorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-lime/70 hover:text-lime transition-colors"
          >
            View on Explorer -&gt;
          </a>
        )}
        <Button variant="secondary" size="sm" onClick={() => { setSuccess(false); setTxHash(null); }}>
          Continue
        </Button>
      </div>
    );
  }

  if (canClaim && isConnected) {
    const hasStake = position &&
      (BigInt(position.stake_a || "0") > BigInt(0) || BigInt(position.stake_b || "0") > BigInt(0));

    return (
      <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-5">
        <h3 className="font-bold text-white">
          {market.status === "RESOLVED" ? "Market Resolved" : "Market Cancelled"}
        </h3>

        {market.status === "RESOLVED" && market.winner && (
          <div className="bg-lime-soft border border-lime/20 rounded-lg p-3 text-center">
            <div className="text-xs text-muted font-mono mb-1">Winner</div>
            <div className="text-lime font-bold">
              {market.winner === "A" ? market.side_a : market.winner === "B" ? market.side_b : "Voided"}
            </div>
          </div>
        )}

        {market.status === "CANCELLED" && (
          <p className="text-secondary text-sm">This market was cancelled. All participants can claim refunds.</p>
        )}

        {hasStake && position && (
          <div className="bg-surface-soft rounded-lg p-3 border border-subtle text-sm font-mono space-y-1">
            {BigInt(position.stake_a || "0") > BigInt(0) && (
              <div className="flex justify-between text-xs">
                <span className="text-muted">Your Side A stake</span>
                <span className="text-white">{formatGEN(position.stake_a)} GEN</span>
              </div>
            )}
            {BigInt(position.stake_b || "0") > BigInt(0) && (
              <div className="flex justify-between text-xs">
                <span className="text-muted">Your Side B stake</span>
                <span className="text-white">{formatGEN(position.stake_b)} GEN</span>
              </div>
            )}
          </div>
        )}

        {payout && (
          <div className="bg-surface-soft rounded-lg p-3 border border-subtle text-sm font-mono space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Claimable</span>
              <span className="text-lime font-bold">{formatGEN(payout.claimable)} GEN</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Status</span>
              <span className="text-secondary">{payout.reason}</span>
            </div>
          </div>
        )}

        {error && <p className="text-danger text-xs font-mono">{error}</p>}

        {payout && BigInt(payout.claimable || "0") > BigInt(0) && (
          <Button className="w-full" onClick={handleClaim} loading={claiming}>
            Claim {formatGEN(payout.claimable)} GEN
          </Button>
        )}

        {!hasStake && (
          <p className="text-muted text-sm text-center font-mono">You have no position in this market.</p>
        )}
      </div>
    );
  }

  if (!canBet) {
    const msgs: Record<string, string> = {
      CLOSED: "Betting closed. Anyone can now trigger GenLayer resolution.",
      AWAITING_RESOLUTION: "Resolution is ready. Any user can trigger GenLayer consensus.",
      UNDER_RESOLUTION: "GenLayer validators are resolving this market now.",
      RESOLVED: "Market resolved. Connect wallet to view your payout.",
      UNRESOLVED: "The last resolution attempt was inconclusive. Another permissionless retry may succeed later.",
      CANCELLED: "Market cancelled. Connect wallet to claim refund.",
    };

    return (
      <div className="bg-surface-card border border-subtle rounded-xl p-6 text-center">
        <p className="text-secondary text-sm">{msgs[market.status] ?? "Betting is closed."}</p>
        {canTriggerResolution && (
          <Button className="mt-4" onClick={handleTriggerResolution} loading={resolving} size="sm">
            Trigger GenLayer Resolution
          </Button>
        )}
        {!isConnected && canClaim && (
          <Button className="mt-4" onClick={connect} size="sm">Connect Wallet</Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-5">
      <h3 className="font-bold text-white" style={{ letterSpacing: "-0.01em" }}>Place a Bet</h3>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSide("A")}
          className={`p-4 rounded-xl border text-left transition-all ${
            side === "A" ? "border-lime/40 bg-lime-soft" : "border-subtle bg-surface-soft hover:border-default"
          }`}
        >
          <div className="text-xs font-mono text-muted mb-1">Side A</div>
          <div className="font-semibold text-white text-sm leading-snug">{market.side_a}</div>
          <div className="mt-2 text-lime text-xs font-mono font-bold">{oddsA}%</div>
        </button>

        <button
          onClick={() => setSide("B")}
          className={`p-4 rounded-xl border text-left transition-all ${
            side === "B" ? "border-white/30 bg-surface-raised" : "border-subtle bg-surface-soft hover:border-default"
          }`}
        >
          <div className="text-xs font-mono text-muted mb-1">Side B</div>
          <div className="font-semibold text-white text-sm leading-snug">{market.side_b}</div>
          <div className="mt-2 text-secondary text-xs font-mono font-bold">{oddsB}%</div>
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-secondary font-medium">Bet Amount (GEN)</label>
        <div className="relative">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs font-mono">GEN</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d*$/.test(v)) setAmount(v);
            }}
            className="w-full bg-surface-soft border border-default rounded-lg pl-4 pr-12 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-active transition-all"
          />
        </div>
        <div className="flex gap-2">
          {["0.1", "0.5", "1", "5"].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className="text-xs px-2 py-1 rounded bg-surface-raised border border-subtle text-muted hover:text-white hover:border-default transition-all"
            >
              {v} GEN
            </button>
          ))}
        </div>
      </div>

      {side && Number(amount) > 0 && (
        <div className="bg-surface-soft rounded-lg p-3 border border-subtle text-sm font-mono space-y-1 animate-fade-in">
          <div className="flex justify-between text-muted text-xs">
            <span>Your bet</span>
            <span className="text-white font-bold">{amount} GEN on Side {side}</span>
          </div>
        </div>
      )}

      {market.status === "PENDING_LIQUIDITY" && (
        <div className="bg-gold/10 border border-gold/20 rounded-lg p-3 text-xs text-gold">
          This market needs bets on both sides. If only one side has liquidity by close time, the market is cancelled and all bets are refunded.
        </div>
      )}

      {error && <p className="text-danger text-xs font-mono">{error}</p>}

      {txState.status === "confirming" && (
        <p className="text-lime text-xs font-mono animate-pulse">Confirming transaction...</p>
      )}

      {!isConnected ? (
        <Button className="w-full" onClick={connect}>Connect Wallet to Bet</Button>
      ) : (
        <Button
          className="w-full"
          onClick={handleBet}
          loading={loading}
          disabled={!side || !amount || Number(amount) <= 0}
        >
          {side ? `Bet ${amount || "0"} GEN on ${side === "A" ? market.side_a : market.side_b}` : "Select a side"}
        </Button>
      )}

      {isConnected && address && (
        <p className="text-[11px] text-muted text-center font-mono">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      )}

      {position && (BigInt(position.stake_a || "0") > BigInt(0) || BigInt(position.stake_b || "0") > BigInt(0)) && (
        <div className="bg-surface-soft rounded-lg p-3 border border-subtle text-sm font-mono space-y-1">
          <div className="text-xs text-muted mb-1">Your Position</div>
          {BigInt(position.stake_a || "0") > BigInt(0) && (
            <div className="flex justify-between text-xs">
              <span className="text-lime">{market.side_a}</span>
              <span className="text-white">{formatGEN(position.stake_a)} GEN</span>
            </div>
          )}
          {BigInt(position.stake_b || "0") > BigInt(0) && (
            <div className="flex justify-between text-xs">
              <span className="text-secondary">{market.side_b}</span>
              <span className="text-white">{formatGEN(position.stake_b)} GEN</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-surface-soft border border-subtle rounded-lg p-3 text-center space-y-1.5">
        <p className="text-[11px] text-muted font-mono">Don&apos;t have GEN tokens?</p>
        <a
          href="https://studio.genlayer.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-lime hover:text-lime-hover transition-colors"
        >
          Claim free GEN from Studio -&gt;
        </a>
      </div>
    </div>
  );
}
