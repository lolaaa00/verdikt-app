"use client";
import { useState, useEffect } from "react";
import { ContractMarket, ContractSuggestion, ContractConfig } from "@/types";
import { StatusBadge, SuggestionStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input, { Textarea } from "@/components/ui/Input";
import Tabs from "@/components/ui/Tabs";
import Footer from "@/components/layout/Footer";
import { useWallet } from "@/contexts/WalletContext";
import { useContract } from "@/hooks/useContract";
import { getExplorerTxUrl, isAdmin } from "@/lib/genlayer/config";
import { formatGEN, formatTimestamp } from "@/lib/format";

type ActionState = Record<string, {
  loading: boolean;
  result: string | null;
  txHash: string | null;
  error: string | null;
}>;

const ADMIN_TABS = [
  { key: "suggestions", label: "Suggestions" },
  { key: "markets",     label: "Markets" },
  { key: "create",      label: "Create Market" },
  { key: "config",      label: "Config" },
];

export default function VerdminPage() {
  const { isConnected, connect, address } = useWallet();
  const contract = useContract();

  const [tab, setTab] = useState("suggestions");
  const [markets, setMarkets] = useState<ContractMarket[]>([]);
  const [suggestions, setSuggestions] = useState<ContractSuggestion[]>([]);
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [actions, setActions] = useState<ActionState>({});
  const [loadingAll, setLoadingAll] = useState(false);

  // Create market form
  const [createForm, setCreateForm] = useState({
    title: "", sideA: "", sideB: "", question: "", rule: "", sources: "", deadline: "", resolutionAvailable: "", voidConditions: "", evidenceType: "web",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [createTxHash, setCreateTxHash] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");

  // Cancel form
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Config form
  const [cfgFeeBps, setCfgFeeBps] = useState("");
  const [cfgMinStake, setCfgMinStake] = useState("");
  const [cfgMinLiquidity, setCfgMinLiquidity] = useState("");

  // Protocol fees
  const [protocolFees, setProtocolFees] = useState<string>("0");
  const [withdrawingFees, setWithdrawingFees] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<string | null>(null);

  // Reject reason
  const [rejectReason, setRejectReason] = useState("");

  async function fetchAll() {
    setLoadingAll(true);
    try {
      const [m, s, c, fees] = await Promise.all([
        contract.getAllMarkets().catch((e) => { console.error("getAllMarkets error:", e); return [] as ContractMarket[]; }),
        contract.getAllSuggestions().catch((e) => { console.error("getAllSuggestions error:", e); return [] as ContractSuggestion[]; }),
        contract.getConfig().catch((e) => { console.error("getConfig error:", e); return null; }),
        contract.getProtocolFees().catch(() => "0"),
      ]);
      setMarkets(m);
      setSuggestions(s);
      setConfig(c);
      setProtocolFees(fees);
    } catch (e) {
      console.error("fetchAll error:", e);
    }
    setLoadingAll(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isConnected && address && isAdmin(address)) {
      fetchAll();
    }
  }, [isConnected, address]);

  function setAction(id: string, update: Partial<{
    loading: boolean;
    result: string | null;
    txHash: string | null;
    error: string | null;
  }>) {
    setActions((prev) => {
      const base = prev[id] || { loading: false, result: null, txHash: null, error: null };
      return { ...prev, [id]: { ...base, ...update } };
    });
  }

  function renderTxResult(state?: ActionState[string]) {
    if (!state?.result) return null;
    if (!state.txHash) {
      return <p className="text-[11px] font-mono text-lime">{state.result}</p>;
    }

    return (
      <a
        href={getExplorerTxUrl(state.txHash)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-[11px] font-mono text-lime hover:text-lime-hover transition-colors"
      >
        {state.result} ↗
      </a>
    );
  }

  // Gate: not admin
  if (!isConnected) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Admin Access Required</h2>
          <p className="text-secondary text-sm">Connect the admin wallet to access this page.</p>
          <Button onClick={connect}>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin(address)) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-secondary text-sm font-mono">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}<br />
            This wallet is not the contract owner.
          </p>
        </div>
      </div>
    );
  }

  // ---- Handlers ----

  async function handleApprove(id: number) {
    const key = `s-${id}`;
    setAction(key, { loading: true, result: null, txHash: null, error: null });
    try {
      const hash = await contract.approveSuggestion(id);
      setAction(key, { loading: false, result: `Approved! Tx: ${hash.slice(0, 16)}...`, txHash: hash });
      fetchAll();
    } catch (e: unknown) {
      setAction(key, { loading: false, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleReject(id: number) {
    const key = `s-${id}`;
    setAction(key, { loading: true, result: null, txHash: null, error: null });
    try {
      await contract.rejectSuggestion(id, rejectReason || "Rejected by admin");
      setAction(key, { loading: false, result: "Rejected", txHash: null });
      setRejectReason("");
      fetchAll();
    } catch (e: unknown) {
      setAction(key, { loading: false, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleCreateMarket() {
    const { title, sideA, sideB, question, rule, deadline, resolutionAvailable, voidConditions, evidenceType } = createForm;
    if (!title || !sideA || !sideB || !question || !rule || !deadline || !resolutionAvailable || !voidConditions || !evidenceType) {
      setCreateError("Fill all required fields"); return;
    }
    setCreateLoading(true); setCreateError(""); setCreateResult(null); setCreateTxHash(null);
    try {
      const closeTs = Math.floor(new Date(deadline).getTime() / 1000);
      const resolutionAvailableTs = Math.floor(new Date(resolutionAvailable).getTime() / 1000);
      const sourcesStr = createForm.sources.trim()
        ? JSON.stringify(createForm.sources.split("\n").filter(Boolean))
        : "[]";
      const hash = await contract.createMarket(
        title,
        sideA,
        sideB,
        question,
        rule,
        sourcesStr,
        closeTs,
        resolutionAvailableTs,
        voidConditions,
        evidenceType,
      );
      setCreateResult(`Market created! Tx: ${hash.slice(0, 16)}...`);
      setCreateTxHash(hash);
      setCreateForm({ title: "", sideA: "", sideB: "", question: "", rule: "", sources: "", deadline: "", resolutionAvailable: "", voidConditions: "", evidenceType: "web" });
      fetchAll();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleClose(marketId: number) {
    const key = `m-${marketId}`;
    setAction(key, { loading: true, result: null, txHash: null, error: null });
    try {
      const hash = await contract.closeMarket(marketId);
      setAction(key, { loading: false, result: `Closed! Tx: ${hash.slice(0, 16)}...`, txHash: hash });
      fetchAll();
    } catch (e: unknown) {
      setAction(key, { loading: false, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleTriggerResolution(marketId: number) {
    const key = `m-${marketId}`;
    setAction(key, { loading: true, result: null, txHash: null, error: null });
    try {
      const hash = await contract.triggerResolution(marketId);
      setAction(key, { loading: false, result: `Resolution triggered. Tx: ${hash.slice(0, 16)}...`, txHash: hash });
      fetchAll();
    } catch (e: unknown) {
      setAction(key, { loading: false, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleCancel() {
    if (cancelId === null) return;
    const key = `m-${cancelId}`;
    setAction(key, { loading: true, result: null, txHash: null, error: null });
    try {
      const hash = await contract.cancelMarket(cancelId, cancelReason || "Cancelled by admin");
      setAction(key, { loading: false, result: `Cancelled! Tx: ${hash.slice(0, 16)}...`, txHash: hash });
      setCancelId(null);
      setCancelReason("");
      fetchAll();
    } catch (e: unknown) {
      setAction(key, { loading: false, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleSetConfig() {
    try {
      const feeBps = parseInt(cfgFeeBps);
      if (isNaN(feeBps) || feeBps < 0 || feeBps > 1000) {
        alert("Fee must be 0-1000 bps"); return;
      }
      // Parse GEN strings to wei
      const minStakeWei = cfgMinStake ? BigInt(Math.floor(parseFloat(cfgMinStake) * 1e18)) : BigInt(0);
      const minLiqWei = cfgMinLiquidity ? BigInt(Math.floor(parseFloat(cfgMinLiquidity) * 1e18)) : BigInt(0);
      await contract.setConfig(feeBps, minStakeWei, minLiqWei);
      fetchAll();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === "SUGGESTED");

  return (
    <div className="pt-16">
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-danger tracking-badge">VERDMIN</span>
              {pendingSuggestions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-lime/20 text-lime text-[10px] font-mono font-bold">
                  {pendingSuggestions.length} pending
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
              Admin Control Panel
            </h1>
            <p className="text-secondary mt-1 text-sm">
              Manage markets, suggestions, and protocol config on-chain.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-lime">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <Button variant="secondary" size="sm" onClick={fetchAll} loading={loadingAll}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Markets", value: markets.length, color: "text-white" },
            { label: "Active", value: markets.filter(m => m.status === "ACTIVE" || m.status === "PENDING_LIQUIDITY").length, color: "text-lime" },
            { label: "Pending Suggestions", value: pendingSuggestions.length, color: "text-gold" },
            { label: "Resolved", value: markets.filter(m => m.status === "RESOLVED").length, color: "text-secondary" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-card border border-subtle rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
              <div className="text-muted text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} />

        {/* === SUGGESTIONS === */}
        {tab === "suggestions" && (
          <div className="space-y-4">
            {suggestions.length === 0 ? (
              <div className="bg-surface-card border border-subtle rounded-xl p-12 text-center">
                <p className="text-muted font-mono text-sm">No suggestions yet.</p>
              </div>
            ) : (
              suggestions.map((s) => {
                const key = `s-${s.id}`;
                const state = actions[key];
                const isPending = s.status === "SUGGESTED";
                return (
                  <div key={s.id} className="bg-surface-card border border-subtle rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <SuggestionStatusBadge status={s.status} />
                          <span className="text-[10px] font-mono text-muted">#{s.id}</span>
                        </div>
                        <h3 className="font-bold text-white text-sm">{s.title}</h3>
                      </div>
                      <span className="text-[10px] font-mono text-muted shrink-0">
                        by {s.suggested_by?.slice(0, 6)}...{s.suggested_by?.slice(-4)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-surface-soft rounded-lg p-3 border border-subtle">
                        <div className="text-muted mb-1">Side A</div>
                        <div className="text-white font-medium">{s.side_a}</div>
                      </div>
                      <div className="bg-surface-soft rounded-lg p-3 border border-subtle">
                        <div className="text-muted mb-1">Side B</div>
                        <div className="text-white font-medium">{s.side_b}</div>
                      </div>
                    </div>

                    <div className="bg-surface-soft rounded-lg p-3 border border-subtle text-xs">
                      <div className="text-muted mb-1">Resolution Rule</div>
                      <div className="text-secondary">{s.resolution_rule}</div>
                    </div>

                    <div className="text-[11px] font-mono text-muted">
                      Close: {formatTimestamp(s.close_ts)}
                    </div>

                    {isPending && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(s.id)} loading={state?.loading}>
                            Approve → Create Market
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleReject(s.id)} loading={state?.loading}>
                            Reject
                          </Button>
                        </div>
                        <input
                          placeholder="Reject reason (optional)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full bg-surface-soft border border-subtle rounded-lg px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    )}

                    {renderTxResult(state)}
                    {state?.error && <p className="text-[11px] font-mono text-danger">{state.error}</p>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === MARKETS === */}
        {tab === "markets" && (
          <div className="space-y-4">
            {markets.length === 0 ? (
              <div className="bg-surface-card border border-subtle rounded-xl p-12 text-center">
                <p className="text-muted font-mono text-sm">No markets yet.</p>
              </div>
            ) : markets.map((m) => {
              const key = `m-${m.id}`;
              const state = actions[key];
              const totalWei = BigInt(m.pool_a || "0") + BigInt(m.pool_b || "0");
              const isPastClose = m.close_ts * 1000 < Date.now();

              return (
                <div key={m.id} className="bg-surface-card border border-subtle rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={m.status} />
                        <span className="text-[10px] font-mono text-muted">#{m.id}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm">{m.title}</h3>
                    </div>
                    <div className="text-right text-xs font-mono text-muted">
                      <div>Pool: {formatGEN(totalWei.toString())} GEN</div>
                      <div>Close: {formatTimestamp(m.close_ts)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-surface-soft rounded-lg p-2 border border-subtle">
                      <span className="text-muted">A: </span>
                      <span className="text-white">{m.side_a}</span>
                      <span className="text-lime ml-2">{formatGEN(m.pool_a)} GEN</span>
                    </div>
                    <div className="bg-surface-soft rounded-lg p-2 border border-subtle">
                      <span className="text-muted">B: </span>
                      <span className="text-white">{m.side_b}</span>
                      <span className="text-secondary ml-2">{formatGEN(m.pool_b)} GEN</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Close market */}
                    {(m.status === "PENDING_LIQUIDITY" || m.status === "ACTIVE") && isPastClose && (
                      <Button size="sm" variant="secondary" onClick={() => handleClose(m.id)} loading={state?.loading}>
                        Close Market
                      </Button>
                    )}

                    {(m.status === "CLOSED" || m.status === "AWAITING_RESOLUTION" || m.status === "UNRESOLVED") && (
                      <Button size="sm" onClick={() => handleTriggerResolution(m.id)} loading={state?.loading}>
                        Trigger GenLayer Resolution
                      </Button>
                    )}

                    {/* Cancel */}
                    {(m.status === "PENDING_LIQUIDITY" || m.status === "ACTIVE" || m.status === "CLOSED" || m.status === "AWAITING_RESOLUTION" || m.status === "UNRESOLVED") && (
                      <>
                        {cancelId === m.id ? (
                          <div className="flex items-end gap-2 w-full">
                            <input
                              placeholder="Cancel reason"
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              className="flex-1 bg-surface-soft border border-subtle rounded-lg px-3 py-2 text-xs text-white font-mono"
                            />
                            <Button size="sm" variant="danger" onClick={handleCancel} loading={state?.loading}>
                              Confirm Cancel
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setCancelId(null)}>Back</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => setCancelId(m.id)}>Cancel Market</Button>
                        )}
                      </>
                    )}

                    {m.status === "RESOLVED" && (
                      <span className="text-xs font-mono text-lime">
                        Winner: {m.winner === "A" ? m.side_a : m.winner === "B" ? m.side_b : "VOID"}
                      </span>
                    )}
                    {m.status === "CANCELLED" && (
                      <span className="text-xs font-mono text-muted">Cancelled</span>
                    )}
                  </div>

                  {renderTxResult(state)}
                  {state?.error && <p className="text-[11px] font-mono text-danger">{state.error}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* === CREATE MARKET === */}
        {tab === "create" && (
          <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-5 max-w-3xl">
            <h2 className="font-bold text-white">Create Official Market</h2>
            <Input label="Title *" value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} />
            <Input label="Resolution Question *" value={createForm.question} onChange={(e) => setCreateForm(f => ({ ...f, question: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Side A *" value={createForm.sideA} onChange={(e) => setCreateForm(f => ({ ...f, sideA: e.target.value }))} />
              <Input label="Side B *" value={createForm.sideB} onChange={(e) => setCreateForm(f => ({ ...f, sideB: e.target.value }))} />
            </div>
            <Textarea label="Resolution Rule *" rows={3} value={createForm.rule} onChange={(e) => setCreateForm(f => ({ ...f, rule: e.target.value }))} />
            <Textarea label="Void Conditions *" rows={2} value={createForm.voidConditions} onChange={(e) => setCreateForm(f => ({ ...f, voidConditions: e.target.value }))} />
            <Textarea label="Sources (one URL per line)" rows={2} value={createForm.sources} onChange={(e) => setCreateForm(f => ({ ...f, sources: e.target.value }))} />
            <Input label="Evidence Type *" value={createForm.evidenceType} onChange={(e) => setCreateForm(f => ({ ...f, evidenceType: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Close Date/Time *" type="datetime-local" value={createForm.deadline} onChange={(e) => setCreateForm(f => ({ ...f, deadline: e.target.value }))} />
              <Input label="Evidence Available After *" type="datetime-local" value={createForm.resolutionAvailable} onChange={(e) => setCreateForm(f => ({ ...f, resolutionAvailable: e.target.value }))} />
            </div>

            {createError && <p className="text-danger text-sm font-mono">{createError}</p>}
            {createResult && createTxHash && (
              <a
                href={getExplorerTxUrl(createTxHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-lime text-sm font-mono hover:text-lime-hover transition-colors"
              >
                {createResult} ↗
              </a>
            )}

            <Button onClick={handleCreateMarket} loading={createLoading}>
              Create Market On-Chain
            </Button>
          </div>
        )}

        {/* === CONFIG === */}
        {tab === "config" && (
          <div className="space-y-6">
            {config && (
              <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-3">
                <h3 className="font-bold text-white">Current Config</h3>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-surface-soft rounded-lg p-3 border border-subtle">
                    <div className="text-muted mb-1">Fee</div>
                    <div className="text-white font-bold">{config.fee_bps} bps ({(config.fee_bps / 100).toFixed(1)}%)</div>
                  </div>
                  <div className="bg-surface-soft rounded-lg p-3 border border-subtle">
                    <div className="text-muted mb-1">Min Stake</div>
                    <div className="text-white font-bold">{formatGEN(config.min_stake_wei)} GEN</div>
                  </div>
                  <div className="bg-surface-soft rounded-lg p-3 border border-subtle">
                    <div className="text-muted mb-1">Min Side Liquidity</div>
                    <div className="text-white font-bold">{formatGEN(config.min_side_liquidity_wei)} GEN</div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-muted">
                  Owner: {config.owner}
                </div>
              </div>
            )}

            <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-4 max-w-xl">
              <h3 className="font-bold text-white">Protocol Fees</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted font-mono">Accumulated Fees</div>
                  <div className="text-lg text-lime font-bold font-mono">{formatGEN(protocolFees)} GEN</div>
                </div>
                <Button
                  onClick={async () => {
                    setWithdrawingFees(true);
                    setWithdrawResult(null);
                    try {
                      const txHash = await contract.withdrawProtocolFees();
                      setWithdrawResult(`Withdrawn! Tx: ${txHash}`);
                      const fees = await contract.getProtocolFees();
                      setProtocolFees(fees);
                    } catch (e) {
                      console.error("Withdraw fees error:", e);
                      setWithdrawResult(`Error: ${e instanceof Error ? e.message : "Failed"}`);
                    }
                    setWithdrawingFees(false);
                  }}
                  disabled={withdrawingFees || protocolFees === "0"}
                >
                  {withdrawingFees ? "Withdrawing..." : "Withdraw Fees"}
                </Button>
              </div>
              {withdrawResult && (
                <div className={`text-xs font-mono ${withdrawResult.startsWith("Error") ? "text-danger" : "text-lime"}`}>
                  {withdrawResult}
                </div>
              )}
            </div>

            <div className="bg-surface-card border border-subtle rounded-xl p-6 space-y-4 max-w-xl">
              <h3 className="font-bold text-white">Update Config</h3>
              <Input label="Fee (basis points, max 1000)" type="number" value={cfgFeeBps} onChange={(e) => setCfgFeeBps(e.target.value)} placeholder="e.g. 500 = 5%" />
              <Input label="Min Stake (GEN)" value={cfgMinStake} onChange={(e) => setCfgMinStake(e.target.value)} placeholder="e.g. 0.01" />
              <Input label="Min Side Liquidity (GEN)" value={cfgMinLiquidity} onChange={(e) => setCfgMinLiquidity(e.target.value)} placeholder="e.g. 0.1" />
              <Button onClick={handleSetConfig}>Update Config On-Chain</Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
