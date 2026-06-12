"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createClient as createGenLayerClient } from "genlayer-js";
import { getGenLayerChain, getWalletChainParams } from "@/lib/genlayer/config";

// EIP-1193 provider type
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type WalletState = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ReturnType<typeof createGenLayerClient> | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
};

const WalletContext = createContext<WalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  client: null,
  connect: async () => {},
  switchNetwork: async () => {},
  disconnect: () => {},
  error: null,
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [client, setClient] = useState<ReturnType<typeof createGenLayerClient> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address;

  const createClientWithProvider = useCallback((addr: string) => {
    const glClient = createGenLayerClient({
      chain: getGenLayerChain(),
      account: addr as `0x${string}`,
      provider: window.ethereum as EthereumProvider,
    });
    setClient(glClient);
    return glClient;
  }, []);

  const switchToStudionet = useCallback(async () => {
    if (!window.ethereum) return;
    const chainParams = getWalletChainParams();

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [chainParams],
      });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainParams.chainId }],
      });
    } catch (walletError: unknown) {
      const errorCode = (walletError as { code?: number | string })?.code;
      if (errorCode === 4902 || errorCode === "4902") {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [chainParams],
        });
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainParams.chainId }],
        });
      } else {
        throw walletError;
      }
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      await switchToStudionet();
      const id = (await window.ethereum?.request({
        method: "eth_chainId",
      })) as string | undefined;
      if (id) setChainId(parseInt(id, 16));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add or switch to StudioNet";
      setError(msg);
      throw err;
    }
  }, [switchToStudionet]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask or a Web3 wallet is required. Please install MetaMask.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const addr = accounts[0];
      setAddress(addr);

      // Auto-add and switch to Studionet
      await switchNetwork();

      const id = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      setChainId(parseInt(id, 16));

      createClientWithProvider(addr);

      // Persist connection
      localStorage.setItem("verdikt_wallet_connected", "true");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(msg);
      console.error("Wallet connect error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [createClientWithProvider, switchNetwork]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setClient(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem("verdikt_wallet_connected");
  }, []);

  // Auto-reconnect
  useEffect(() => {
    const wasConnected = localStorage.getItem("verdikt_wallet_connected");
    if (wasConnected && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          const accs = accounts as string[];
          if (accs && accs.length > 0) {
            switchToStudionet()
              .then(() => {
                setAddress(accs[0]);
                createClientWithProvider(accs[0]);
                return window.ethereum!.request({ method: "eth_chainId" });
              })
              .then((id) => {
                setChainId(parseInt(id as string, 16));
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [createClientWithProvider, switchToStudionet]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        switchToStudionet()
          .then(() => {
            setAddress(accounts[0]);
            createClientWithProvider(accounts[0]);
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : "Failed to switch network";
            setError(msg);
          });
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      setChainId(parseInt(args[0] as string, 16));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect, createClientWithProvider, switchToStudionet]);

  return (
      <WalletContext.Provider
      value={{ address, isConnected, isConnecting, chainId, client, connect, switchNetwork, disconnect, error }}
    >
      {children}
    </WalletContext.Provider>
  );
}
