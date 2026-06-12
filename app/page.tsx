import Link from "next/link";
import Footer from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <div className="pt-16">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-lime/[0.04] rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime/20 bg-lime-soft mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
            <span className="text-lime text-xs font-mono font-bold tracking-badge">POWERED BY GENLAYER INTELLIGENT CONTRACTS</span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-none"
            style={{ letterSpacing: "-0.03em", fontWeight: 800 }}
          >
            You call it.<br />
            <span className="text-lime">The contract confirms it.</span>
          </h1>

          <p className="text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            VERDIKT is an evidence-resolved parimutuel prediction market where GenLayer Intelligent Contracts read public sources and settle markets through validator consensus. No backend oracle. No admin-picked winners.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/arena"
              className="px-8 py-4 bg-lime text-black font-bold rounded-xl text-base hover:bg-lime-hover hover:shadow-button transition-all active:scale-95"
            >
              Enter Arena -&gt;
            </Link>
            <Link
              href="/create"
              className="px-8 py-4 border border-subtle text-white font-medium rounded-xl text-base hover:border-default transition-all"
            >
              Suggest a Market
            </Link>
          </div>

          <p className="text-muted text-xs font-mono mt-4">Connect MetaMask to bet with GEN tokens.</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>How VERDIKT Works</h2>
          <p className="text-muted text-sm font-mono">Three steps. Zero trust required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Pick a Market", desc: "Browse live prediction markets. All markets are on-chain via GenLayer." },
            { step: "02", title: "Bet with GEN", desc: "Choose a side and bet GEN tokens. Parimutuel pools - winners share the losing pool." },
            { step: "03", title: "GenLayer Resolves It", desc: "After the event ends, anyone can trigger resolution. Validators interpret the evidence and settle the market on-chain." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-surface-card border border-subtle rounded-xl p-6 space-y-3 card-hover">
              <span className="text-4xl font-bold text-lime/20 font-mono">{step}</span>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="text-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-subtle bg-surface py-20">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em", fontWeight: 800 }}>
            Fully On-Chain.<br />Parimutuel Pools.
          </h2>
          <p className="text-secondary text-base max-w-2xl mx-auto leading-relaxed">
            Every bet, every payout, every resolution - all on GenLayer. The VerdiktParimutuel contract holds the pools, evaluates trusted evidence, calculates payouts, and distributes winnings automatically without an admin selecting outcomes.
          </p>
          <div className="inline-flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-lime/20 w-16" />
            <span className="text-lime font-mono text-xs font-bold tracking-widest">BUILT ON GENLAYER</span>
            <div className="flex-1 h-px bg-lime/20 w-16" />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4" style={{ letterSpacing: "-0.02em" }}>Ready to predict?</h2>
        <p className="text-muted text-sm mb-8">Browse markets, bet GEN, and claim winnings - all on-chain.</p>
        <Link
          href="/arena"
          className="inline-block px-8 py-4 bg-lime text-black font-bold rounded-xl text-base hover:bg-lime-hover hover:shadow-button transition-all active:scale-95"
        >
          Enter the Arena -&gt;
        </Link>
      </section>

      <Footer />
    </div>
  );
}
