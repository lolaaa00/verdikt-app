"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { isAdmin, STUDIO_NET_CHAIN_ID } from "@/lib/genlayer/config";

const NAV_LINKS = [
  { href: "/arena",       label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/history",     label: "My Positions" },
];

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    address,
    isConnected,
    isConnecting,
    chainId,
    connect,
    switchNetwork,
    disconnect,
    error,
  } = useWallet();
  const isWrongNetwork = isConnected && chainId !== null && chainId !== STUDIO_NET_CHAIN_ID;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-subtle bg-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMobileOpen(false)}>
            <span className="text-lime font-mono text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">▶</span>
            <span className="font-bold text-white" style={{ letterSpacing: "-0.03em", fontWeight: 800, fontSize: "1.188rem" }}>
              VERDIKT
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href) ? "text-lime" : "text-secondary hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/create"
              className={`text-xs font-mono transition-colors ${
                pathname === "/create" ? "text-lime" : "text-muted hover:text-lime"
              }`}
            >
              + Suggest
            </Link>

            {isConnected && address && isAdmin(address) && (
              <Link
                href="/verdmin"
                className={`text-xs font-mono transition-colors ${
                  pathname === "/verdmin" ? "text-danger" : "text-danger/60 hover:text-danger"
                }`}
              >
                Admin
              </Link>
            )}

            {isConnected && address ? (
              <div className="flex items-center gap-2">
                {isWrongNetwork && (
                  <button
                    onClick={switchNetwork}
                    className="px-3 py-2 rounded-lg border border-danger/40 text-xs font-mono text-danger hover:bg-danger/10 transition-all"
                  >
                    Switch to StudioNet
                  </button>
                )}
                <Link
                  href="/me"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-lime/20 bg-lime-soft hover:border-lime/40 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                  <span className="text-xs font-mono text-lime font-bold">
                    {shortenAddress(address)}
                  </span>
                </Link>
                <button
                  onClick={disconnect}
                  className="px-3 py-2 rounded-lg border border-subtle text-xs text-muted hover:text-white hover:border-default transition-all"
                  title="Disconnect wallet"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-4 py-2 rounded-lg bg-lime text-black text-sm font-bold hover:bg-lime-hover hover:shadow-button transition-all disabled:opacity-50 active:scale-95"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
            {error && (
              <p className="max-w-56 text-[10px] leading-tight text-danger" title={error}>
                {error}
              </p>
            )}
          </div>

          <button
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-surface-soft transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-px bg-white transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-px bg-white transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-px bg-white transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute top-16 left-0 right-0 bg-surface border-b border-subtle p-4 space-y-1 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href) ? "text-lime bg-lime-soft" : "text-secondary hover:text-white hover:bg-surface-soft"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/create"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-secondary hover:text-white hover:bg-surface-soft"
            >
              + Suggest Market
            </Link>
            {isConnected && address && isAdmin(address) && (
              <Link
                href="/verdmin"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-danger/60 hover:text-danger hover:bg-surface-soft"
              >
                Admin Panel
              </Link>
            )}
            <div className="pt-3 pb-1">
              {isConnected && address ? (
                <>
                  {isWrongNetwork && (
                    <button
                      onClick={() => { switchNetwork(); setMobileOpen(false); }}
                      className="w-full mb-3 py-3 rounded-xl border border-danger/40 text-sm font-mono text-danger"
                    >
                      Switch to StudioNet
                    </button>
                  )}
                  <div className="flex gap-3">
                    <Link
                      href="/me"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 py-3 rounded-xl border border-lime/20 bg-lime-soft text-sm font-mono font-bold text-lime text-center"
                    >
                      {shortenAddress(address)}
                    </Link>
                    <button
                      onClick={() => { disconnect(); setMobileOpen(false); }}
                      className="px-4 py-3 rounded-xl border border-subtle text-sm text-muted"
                    >
                      ✕
                    </button>
                  </div>
                  {error && <p className="mt-3 text-xs text-danger">{error}</p>}
                </>
              ) : (
                <button
                  onClick={() => { connect(); setMobileOpen(false); }}
                  disabled={isConnecting}
                  className="w-full py-3 rounded-xl bg-lime text-black text-sm font-bold text-center hover:bg-lime-hover transition-all"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
