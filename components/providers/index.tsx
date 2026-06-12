"use client";
import { useEffect, useState } from "react";
import { WalletProvider } from "@/contexts/WalletContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <WalletProvider>{children}</WalletProvider>;
}
