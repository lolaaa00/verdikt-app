import Link from "next/link";

const LINKS = [
  { label: "Arena",          href: "/arena" },
  { label: "Leaderboard",    href: "/leaderboard" },
  { label: "Create Market",  href: "/create" },
  { label: "History",        href: "/history" },
  { label: "GenLayer",       href: "https://genlayer.com", external: true },
];

export default function Footer() {
  return (
    <footer className="border-t border-subtle mt-24 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lime font-mono text-xs opacity-60">▶</span>
              <span className="text-lg font-bold text-white" style={{ letterSpacing: "-0.03em", fontWeight: 800 }}>
                VERDIKT
              </span>
            </div>
            <p className="text-muted text-xs font-mono max-w-xs leading-relaxed">
              You call it. The contract confirms it.<br />
              Prediction markets settled by GenLayer Intelligent Contracts.
            </p>
            {/* Powered by badge */}
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border border-subtle bg-surface-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-lime" />
              <span className="text-[11px] font-mono text-muted">Powered by GenLayer</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map(({ label, href, external }) => (
              external
                ? <a key={label} href={href} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-lime transition-colors">{label}</a>
                : <Link key={label} href={href} className="text-sm text-muted hover:text-lime transition-colors">{label}</Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-muted">
            © 2025 VERDIKT · GenLayer Bradbury Testnet
          </p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-muted">
            <span>No oracle required.</span>
            <span className="text-muted/30">·</span>
            <span>No admin key.</span>
            <span className="text-muted/30">·</span>
            <span className="text-lime/70">Truth on-chain.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
