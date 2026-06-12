"use client";
import { useState } from "react";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import Input, { Textarea } from "@/components/ui/Input";
import { useWallet } from "@/contexts/WalletContext";
import { useContract } from "@/hooks/useContract";
import { getExplorerTxUrl } from "@/lib/genlayer/config";

export default function SuggestMarketPage() {
  const { isConnected, connect } = useWallet();
  const { suggestMarket, txState } = useContract();

  const [form, setForm] = useState({
    title: "",
    sideA: "",
    sideB: "",
    question: "",
    rule: "",
    sources: "",
    deadline: "",
    resolutionAvailable: "",
    voidConditions: "",
    evidenceType: "web",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState("");

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    const {
      title,
      sideA,
      sideB,
      question,
      rule,
      deadline,
      resolutionAvailable,
      voidConditions,
      evidenceType,
    } = form;

    if (!title || !sideA || !sideB || !question || !rule || !deadline || !resolutionAvailable || !voidConditions || !evidenceType) {
      setError("Fill in all required fields.");
      return;
    }
    if (!isConnected) {
      connect();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const closeTs = Math.floor(new Date(deadline).getTime() / 1000);
      const resolutionAvailableTs = Math.floor(new Date(resolutionAvailable).getTime() / 1000);

      if (closeTs <= Math.floor(Date.now() / 1000)) {
        throw new Error("Deadline must be in the future");
      }
      if (resolutionAvailableTs < closeTs) {
        throw new Error("Evidence available time must be at or after close time");
      }

      const sourcesStr = form.sources.trim()
        ? JSON.stringify(form.sources.split("\n").filter(Boolean))
        : "[]";

      const hash = await suggestMarket(
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
      setTxHash(hash);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-lime/10 border border-lime/30 flex items-center justify-center mx-auto text-2xl">OK</div>
          <h2 className="text-xl font-bold text-white">Suggestion Submitted On-Chain</h2>
          <p className="text-secondary text-sm">
            Your market suggestion has been recorded on the blockchain. Admin can curate whether it is listed, but final market outcomes must be resolved by GenLayer consensus.
          </p>
          {txHash && (
            <a
              href={getExplorerTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-mono text-lime/70 hover:text-lime transition-colors"
            >
              View transaction -&gt;
            </a>
          )}
          <div className="flex gap-3 justify-center">
            <a href="/arena" className="inline-block px-5 py-2.5 bg-lime text-black font-bold rounded-lg text-sm hover:bg-lime-hover transition-all">
              View Arena
            </a>
            <button
              onClick={() => {
                setSuccess(false);
                setTxHash(null);
                setForm({
                  title: "",
                  sideA: "",
                  sideB: "",
                  question: "",
                  rule: "",
                  sources: "",
                  deadline: "",
                  resolutionAvailable: "",
                  voidConditions: "",
                  evidenceType: "web",
                });
              }}
              className="px-5 py-2.5 border border-subtle text-secondary font-bold rounded-lg text-sm hover:text-white hover:border-default transition-all"
            >
              Suggest Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <div className="border-b border-subtle bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
            Suggest a Market
          </h1>
          <p className="text-secondary mt-2 text-sm">
            Propose an evidence-resolved market on-chain. Approved listings go live for betting, and final outcomes are settled by GenLayer consensus.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-surface-card border border-subtle rounded-xl p-6 space-y-5">
          <h2 className="font-bold text-white">Market Details</h2>
          <Input label="Title *" placeholder="e.g. Will Arsenal beat Chelsea?" value={form.title} onChange={(e) => update("title", e.target.value)} />
          <Input label="Resolution Question *" placeholder="e.g. Did Arsenal beat Chelsea on June 20, 2026?" value={form.question} onChange={(e) => update("question", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Side A *" placeholder="e.g. YES" value={form.sideA} onChange={(e) => update("sideA", e.target.value)} />
            <Input label="Side B *" placeholder="e.g. NO" value={form.sideB} onChange={(e) => update("sideB", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Close Date & Time *" type="datetime-local" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
            <Input label="Evidence Available After *" type="datetime-local" value={form.resolutionAvailable} onChange={(e) => update("resolutionAvailable", e.target.value)} />
          </div>
        </section>

        <section className="bg-surface-card border border-subtle rounded-xl p-6 space-y-5">
          <h2 className="font-bold text-white">Resolution Metadata</h2>
          <Textarea
            label="Resolution Rule *"
            placeholder="Describe exactly how validators should resolve the market from public evidence."
            rows={4}
            value={form.rule}
            onChange={(e) => update("rule", e.target.value)}
          />
          <Textarea
            label="Void Conditions *"
            placeholder="e.g. Void if the event is cancelled, postponed beyond 72 hours, or trusted sources contradict each other."
            rows={3}
            value={form.voidConditions}
            onChange={(e) => update("voidConditions", e.target.value)}
          />
          <Input
            label="Evidence Type *"
            placeholder="e.g. sports result, earnings report, official government release"
            value={form.evidenceType}
            onChange={(e) => update("evidenceType", e.target.value)}
          />
          <Textarea
            label="Resolution Sources (one URL per line)"
            placeholder={"https://www.bbc.com/sport/football\nhttps://www.espn.com/soccer"}
            rows={3}
            value={form.sources}
            onChange={(e) => update("sources", e.target.value)}
            hint="GenLayer validators will fetch these sources during resolution."
          />
        </section>

        {error && <p className="text-danger text-sm font-mono">{error}</p>}

        {txState.status === "confirming" && (
          <p className="text-lime text-xs font-mono animate-pulse">Confirming on-chain...</p>
        )}

        {!isConnected ? (
          <Button className="w-full" onClick={connect} size="lg">Connect Wallet to Submit</Button>
        ) : (
          <Button className="w-full" onClick={handleSubmit} loading={loading} size="lg">
            Submit Suggestion On-Chain
          </Button>
        )}

        <p className="text-[11px] font-mono text-muted text-center">
          Suggestions are recorded on-chain and reviewed for market quality. Listing approval is administrative, but winner selection must come from GenLayer evidence resolution.
        </p>
      </div>

      <Footer />
    </div>
  );
}
