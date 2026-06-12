// ---- On-chain market statuses ----
export type MarketStatus =
  | "PENDING_LIQUIDITY"
  | "ACTIVE"
  | "CLOSED"
  | "AWAITING_RESOLUTION"
  | "UNDER_RESOLUTION"
  | "RESOLVED"
  | "UNRESOLVED"
  | "CANCELLED";
export type SuggestionStatus = "SUGGESTED" | "APPROVED" | "REJECTED";
export type ResolutionWinner = "A" | "B" | "VOID" | "UNRESOLVED";

export type ResolutionDetails = {
  winner: ResolutionWinner;
  confidence: number;
  evidence_summary: string[];
  source_urls_checked: string[];
  reasoning: string;
  void_reason: string;
};

// ---- On-chain market shape (parsed from contract JSON) ----
export type ContractMarket = {
  id: number;
  title: string;
  side_a: string;
  side_b: string;
  resolution_question: string;
  resolution_rule: string;
  resolution_sources: string;
  resolution_available_ts: number;
  void_conditions: string;
  evidence_type: string;
  close_ts: number; // unix seconds
  status: MarketStatus;
  pool_a: string;   // wei string
  pool_b: string;   // wei string
  creator: string;
  winner?: ResolutionWinner;
  resolution_note?: string;
  resolved_ts?: number;
  resolution_details?: ResolutionDetails;
};

// ---- On-chain suggestion shape ----
export type ContractSuggestion = {
  id: number;
  title: string;
  side_a: string;
  side_b: string;
  resolution_question: string;
  resolution_rule: string;
  resolution_sources: string;
  close_ts: number;
  resolution_available_ts: number;
  void_conditions: string;
  evidence_type: string;
  status: SuggestionStatus;
  suggested_by: string;
  approved_market_id?: number;
  rejection_reason?: string;
};

// ---- User position from contract ----
export type UserPosition = {
  stake_a: string; // wei string
  stake_b: string; // wei string
};

// ---- Quote payout from contract ----
export type QuotePayout = {
  status: string;
  claimable: string;  // wei string
  reason: string;
  winning_stake?: string;
  profit?: string;
  fee_pool?: string;
};

// ---- Contract config ----
export type ContractConfig = {
  fee_bps: number;
  min_stake_wei: string;
  min_side_liquidity_wei: string;
  owner: string;
};

// ---- Legacy types kept for compatibility ----
export type MarketCategory = "sports" | "crypto" | "esports" | "culture" | "politics" | "other";
export type PositionSide = "A" | "B";
export type VerdiktConfidence = "HIGH" | "MEDIUM" | "LOW";

export type Position = {
  id: string;
  market_id: string;
  user_id: string;
  wallet_address: string | null;
  side: PositionSide;
  amount: number;
  potential_payout: number;
  claimed: boolean;
  claim_tx_hash: string | null;
  created_at: string;
};

export type GenLayerVerdict = {
  winner: "A" | "B" | "VOID" | "UNRESOLVED";
  confidence: VerdiktConfidence;
  publicSummary: string;
  evidenceUsed: string;
  reasonCodes: string[];
};
