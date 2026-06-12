"use client";
import { useState, useCallback, useMemo } from "react";
import { createClient as createGenLayerClient } from "genlayer-js";
import { useWallet } from "@/contexts/WalletContext";
import { GENLAYER_CONFIG, getExplorerTxUrl, getGenLayerChain } from "@/lib/genlayer/config";
import { ContractMarket, ContractSuggestion, ContractConfig, UserPosition, QuotePayout } from "@/types";

const CONTRACT = GENLAYER_CONFIG.contractAddress as `0x${string}`;

type TxState = {
  status: "idle" | "pending" | "confirming" | "success" | "error";
  txHash: string | null;
  error: string | null;
  explorerUrl: string | null;
};

/**
 * Core hook for all VerdiktParimutuel contract interactions.
 * All value amounts are bigint wei — never use floats.
 * Read-only calls work without a connected wallet.
 */
export function useContract() {
  const { client, isConnected, address } = useWallet();
  const [txState, setTxState] = useState<TxState>({
    status: "idle", txHash: null, error: null, explorerUrl: null,
  });

  // Read-only client that works without wallet connection
  const readOnlyClient = useMemo(() => {
    try {
      return createGenLayerClient({ chain: getGenLayerChain() });
    } catch {
      return null;
    }
  }, []);

  // ---- helpers ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function readContract(functionName: string, args: any[] = []) {
    // Use connected client if available, otherwise read-only client
    const c = client || readOnlyClient;
    if (!c) throw new Error("No client available");
    const result = await c.readContract({
      address: CONTRACT,
      functionName,
      args,
    });
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function writeContract(functionName: string, args: any[], value?: bigint) {
    if (!client || !isConnected) throw new Error("Wallet not connected");

    setTxState({ status: "pending", txHash: null, error: null, explorerUrl: null });

    try {
      const txHash = await client.writeContract({
        address: CONTRACT,
        functionName,
        args,
        value: value ?? BigInt(0),
      });

      const hashStr = typeof txHash === "string" ? txHash : String(txHash);
      const explorerUrl = getExplorerTxUrl(hashStr);
      setTxState({ status: "confirming", txHash: hashStr, error: null, explorerUrl });

      await client.waitForTransactionReceipt({
        hash: hashStr as `0x${string}` & { length: 66 },
        interval: 3000,
        retries: 100,
      });

      setTxState({ status: "success", txHash: hashStr, error: null, explorerUrl });
      return hashStr;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setTxState({ status: "error", txHash: null, error: msg, explorerUrl: null });
      throw err;
    }
  }

  // ---- READ: Markets ----

  const getMarketCount = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract("get_market_count");
      return Number(result);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  const getMarket = useCallback(async (id: number): Promise<ContractMarket | null> => {
    try {
      const result = await readContract("get_market", [id]);
      const parsed = JSON.parse(result as string);
      if (parsed.status === "not_found") return null;
      return { ...parsed, id } as ContractMarket;
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  const getAllMarkets = useCallback(async (): Promise<ContractMarket[]> => {
    const count = await getMarketCount();
    if (count === 0) return [];
    const promises = Array.from({ length: count }, (_, i) => getMarket(i));
    const results = await Promise.all(promises);
    return results.filter((m): m is ContractMarket => m !== null);
  }, [getMarketCount, getMarket]);

  // ---- READ: User position ----

  const getUserPosition = useCallback(async (marketId: number, userAddress: string): Promise<UserPosition | null> => {
    try {
      const result = await readContract("get_user_position", [marketId, userAddress]);
      return JSON.parse(result as string) as UserPosition;
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  // ---- READ: Quote payout ----

  const quotePayout = useCallback(async (marketId: number, userAddress: string): Promise<QuotePayout | null> => {
    try {
      const result = await readContract("quote_payout", [marketId, userAddress]);
      return JSON.parse(result as string) as QuotePayout;
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  // ---- READ: Suggestions ----

  const getSuggestionCount = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract("get_suggestion_count");
      return Number(result);
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  const getSuggestion = useCallback(async (id: number): Promise<ContractSuggestion | null> => {
    try {
      const result = await readContract("get_suggestion", [id]);
      const parsed = JSON.parse(result as string);
      if (parsed.status === "not_found") return null;
      return { ...parsed, id } as ContractSuggestion;
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  const getAllSuggestions = useCallback(async (): Promise<ContractSuggestion[]> => {
    const count = await getSuggestionCount();
    if (count === 0) return [];
    const promises = Array.from({ length: count }, (_, i) => getSuggestion(i));
    const results = await Promise.all(promises);
    return results.filter((s): s is ContractSuggestion => s !== null);
  }, [getSuggestionCount, getSuggestion]);

  // ---- READ: Config ----

  const getConfig = useCallback(async (): Promise<ContractConfig | null> => {
    try {
      const result = await readContract("get_config");
      return JSON.parse(result as string) as ContractConfig;
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  // ---- WRITE: User actions ----

  const placeBet = useCallback(async (marketId: number, side: "A" | "B", valueWei: bigint) => {
    return writeContract("place_bet", [marketId, side], valueWei);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const suggestMarket = useCallback(async (
    title: string,
    sideA: string,
    sideB: string,
    resolutionQuestion: string,
    resolutionRule: string,
    resolutionSources: string,
    closeTs: number,
    resolutionAvailableTs: number,
    voidConditions: string,
    evidenceType: string,
  ) => {
    return writeContract("suggest_market", [
      title,
      sideA,
      sideB,
      resolutionQuestion,
      resolutionRule,
      resolutionSources,
      closeTs,
      resolutionAvailableTs,
      voidConditions,
      evidenceType,
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const closeMarket = useCallback(async (marketId: number) => {
    return writeContract("close_market", [marketId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const claim = useCallback(async (marketId: number) => {
    return writeContract("claim", [marketId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  // ---- WRITE: Admin actions ----

  const createMarket = useCallback(async (
    title: string,
    sideA: string,
    sideB: string,
    resolutionQuestion: string,
    resolutionRule: string,
    resolutionSources: string,
    closeTs: number,
    resolutionAvailableTs: number,
    voidConditions: string,
    evidenceType: string,
  ) => {
    return writeContract("create_market", [
      title,
      sideA,
      sideB,
      resolutionQuestion,
      resolutionRule,
      resolutionSources,
      closeTs,
      resolutionAvailableTs,
      voidConditions,
      evidenceType,
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const triggerResolution = useCallback(async (marketId: number) => {
    return writeContract("trigger_resolution", [marketId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const cancelMarket = useCallback(async (marketId: number, reason: string) => {
    return writeContract("cancel_market", [marketId, reason]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const approveSuggestion = useCallback(async (suggestionId: number) => {
    return writeContract("approve_suggestion", [suggestionId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const rejectSuggestion = useCallback(async (suggestionId: number, reason: string) => {
    return writeContract("reject_suggestion", [suggestionId, reason]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const setConfig = useCallback(async (feeBps: number, minStakeWei: bigint, minSideLiquidityWei: bigint) => {
    return writeContract("set_config", [feeBps, minStakeWei.toString(), minSideLiquidityWei.toString()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const getProtocolFees = useCallback(async (): Promise<string> => {
    try {
      const result = await readContract("get_protocol_fees");
      return String(result);
    } catch { return "0"; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, readOnlyClient]);

  const withdrawProtocolFees = useCallback(async () => {
    return writeContract("withdraw_protocol_fees", []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isConnected]);

  const resetTx = useCallback(() => {
    setTxState({ status: "idle", txHash: null, error: null, explorerUrl: null });
  }, []);

  return {
    // reads
    getMarketCount, getMarket, getAllMarkets,
    getUserPosition, quotePayout,
    getSuggestionCount, getSuggestion, getAllSuggestions,
    getConfig, getProtocolFees,
    // user writes
    placeBet, suggestMarket, closeMarket, claim,
    // admin writes
    createMarket, triggerResolution, cancelMarket,
    approveSuggestion, rejectSuggestion, setConfig, withdrawProtocolFees,
    // state
    txState, resetTx,
    isReady: isConnected && !!CONTRACT,
    address,
  };
}
