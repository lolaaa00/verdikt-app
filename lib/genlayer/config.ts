import { chains } from "genlayer-js";

const STUDIO_CHAIN_ID = 61999;
const STUDIO_RPC_URL = "https://studio.genlayer.com/api";

const configuredChain = process.env.NEXT_PUBLIC_GENLAYER_CHAIN || "studio";
const normalizedChain = configuredChain === "studionet" ? "studio" : configuredChain;
const configuredRpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || STUDIO_RPC_URL;
const normalizedRpcUrl = /^https?:\/\//.test(configuredRpcUrl)
  ? configuredRpcUrl
  : `https://${configuredRpcUrl}`;

export const GENLAYER_CONFIG = {
  contractAddress: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "0x7fB423676EE3Fd7C6EF21BD348e2b4E0F7A28560",
  chain: normalizedChain as "studio" | "testnet",
  explorerUrl: "https://explorer-studio.genlayer.com",
  rpcUrl: normalizedRpcUrl,
};

export const STUDIO_NET_CHAIN_ID = STUDIO_CHAIN_ID;

export const STUDIO_NET_CHAIN = {
  ...chains.studionet,
  id: STUDIO_CHAIN_ID,
  rpcUrls: {
    ...chains.studionet.rpcUrls,
    default: {
      ...chains.studionet.rpcUrls.default,
      http: [GENLAYER_CONFIG.rpcUrl],
    },
  },
};

export function getGenLayerChain() {
  if (GENLAYER_CONFIG.chain === "testnet") return chains.testnetBradbury;
  return STUDIO_NET_CHAIN;
}

export function getWalletChainParams() {
  const chain = getGenLayerChain();
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls.default.http,
    ...(chain.blockExplorers?.default?.url
      ? { blockExplorerUrls: [chain.blockExplorers.default.url] }
      : {}),
  };
}

export const ADMIN_WALLET = "0x778d1663f9d5b338abad5c62899830ad3520a32f";

export function getExplorerTxUrl(txHash: string): string {
  return `${GENLAYER_CONFIG.explorerUrl}/transactions/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${GENLAYER_CONFIG.explorerUrl}/address/${address}`;
}

export function isAdmin(address: string | null): boolean {
  if (!address) return false;
  return address.toLowerCase() === ADMIN_WALLET.toLowerCase();
}
