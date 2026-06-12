import { createClient as createGenLayerClient } from "genlayer-js";
import { GENLAYER_CONFIG, getGenLayerChain } from "./config";

/**
 * Create a server-side GenLayer client (no wallet needed — uses private key or read-only).
 * Used by API routes to read contract state.
 */
export function createServerClient() {
  return createGenLayerClient({ chain: getGenLayerChain() });
}

/**
 * Read a verdict result from the FactChecker contract.
 */
export async function readVerdict(claimId: number) {
  const client = createServerClient();
  const contractAddress = GENLAYER_CONFIG.contractAddress;
  if (!contractAddress) throw new Error("Contract address not configured");

  const result = await client.readContract({
    address: contractAddress as `0x${string}`,
    functionName: "get_result",
    args: [claimId],
  });

  try {
    return JSON.parse(result as string);
  } catch {
    return { verdict: "not_found" };
  }
}

/**
 * Read the total claim count from the contract.
 */
export async function getClaimCount() {
  const client = createServerClient();
  const contractAddress = GENLAYER_CONFIG.contractAddress;
  if (!contractAddress) throw new Error("Contract address not configured");

  const result = await client.readContract({
    address: contractAddress as `0x${string}`,
    functionName: "get_claim_count",
    args: [],
  });

  return Number(result);
}
