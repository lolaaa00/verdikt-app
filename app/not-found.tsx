import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-16 min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="text-lime/10 text-8xl font-mono font-bold leading-none select-none">
          404
        </div>
        <div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex-1 h-px bg-lime/20 max-w-[60px]" />
            <span className="text-lime font-mono text-xs tracking-badge uppercase">Verdict Not Found</span>
            <div className="flex-1 h-px bg-lime/20 max-w-[60px]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
            This page doesn&apos;t exist
          </h1>
          <p className="text-secondary text-sm leading-relaxed">
            The market, page, or verdict you&apos;re looking for couldn&apos;t be located.
            It may have been settled, voided, or never existed.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/arena" className="px-6 py-3 bg-lime text-black font-bold rounded-xl text-sm hover:bg-lime-hover hover:shadow-button transition-all">
            Enter Arena
          </Link>
          <Link href="/" className="px-6 py-3 border border-subtle text-secondary rounded-xl text-sm hover:border-default hover:text-white transition-all">
            Go Home
          </Link>
        </div>
        <p className="text-[11px] font-mono text-muted">VERDIKT · GenLayer Bradbury Testnet</p>
      </div>
    </div>
  );
}
