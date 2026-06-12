# VERDIKT

**You call it. The contract confirms it.**

VERDIKT is a GenLayer-native evidence-resolved prediction market.

Users create and bet on markets, but no admin, frontend, or backend gets to choose the winner. After a market closes, anyone can trigger resolution on-chain. The Intelligent Contract fetches trusted public evidence, applies the market's natural-language resolution rule, and GenLayer validators converge on a structured result through consensus.

## Why This Is Now a GenLayer App

The original weak point was simple:

- an admin-controlled resolver is not a meaningful GenLayer use case
- a deterministic contract that only stores a chosen outcome does not use GenLayer consensus for judgment

VERDIKT now fixes that by moving the consensus-critical decision into the Intelligent Contract itself.

The key change is:

- old model: `resolve_market(market_id, winner, note)`
- new model: `trigger_resolution(market_id)`

The caller can trigger resolution, but cannot pass the winner.

The contract determines the outcome by:

1. fetching trusted public sources
2. interpreting those sources against the market's rule
3. returning a structured verdict
4. relying on GenLayer validator consensus for that non-deterministic result

## Core Product Statement

VERDIKT is an evidence-resolved parimutuel market where:

- users propose and fund markets
- admin curates which markets are listed
- GenLayer resolves the outcome from public evidence
- winners and refunds are settled on-chain

This means:

- admin can approve listings
- admin cannot choose winners
- frontend can trigger transactions
- frontend cannot compute final outcomes
- no backend oracle is the source of truth

## Resolution Flow

1. A market is created with explicit resolution metadata.
2. Users place GEN on side A or side B.
3. Betting closes at `close_ts`.
4. Anyone calls `trigger_resolution(market_id)`.
5. The contract fetches the trusted sources.
6. The contract uses GenLayer non-deterministic web access and LLM evaluation to interpret the evidence.
7. Validators compare the result under the Equivalence Principle.
8. The market ends in one of:
   `A`
   `B`
   `VOID`
   `UNRESOLVED`

## Required Market Metadata

Each market now carries the fields needed for evidence-based settlement:

- `title`
- `side_a`
- `side_b`
- `resolution_question`
- `resolution_rule`
- `resolution_sources`
- `close_ts`
- `resolution_available_ts`
- `void_conditions`
- `evidence_type`

This makes the decision explicit enough for validators to independently verify.

## Contract Surface

### Read methods

- `get_market_count`
- `get_market`
- `get_suggestion_count`
- `get_suggestion`
- `get_user_position`
- `quote_payout`
- `get_config`
- `get_protocol_fees`

### User write methods

- `suggest_market(...)`
- `place_bet(market_id, side)`
- `close_market(market_id)`
- `trigger_resolution(market_id)`
- `claim(market_id)`

### Admin write methods

- `create_market(...)`
- `approve_suggestion(id)`
- `reject_suggestion(id, reason)`
- `cancel_market(market_id, reason)`
- `set_config(fee_bps, min_stake, min_liquidity)`
- `withdraw_protocol_fees(recipient, amount)`

## Lifecycle

`SUGGESTED -> APPROVED -> PENDING_LIQUIDITY -> ACTIVE -> AWAITING_RESOLUTION -> UNDER_RESOLUTION -> RESOLVED / UNRESOLVED / CANCELLED`

Meaning:

- `PENDING_LIQUIDITY`: market exists but both sides are not yet funded
- `ACTIVE`: both sides have enough liquidity and betting is open
- `AWAITING_RESOLUTION`: betting is closed and the market is eligible for resolution
- `UNDER_RESOLUTION`: validators are currently evaluating evidence
- `RESOLVED`: consensus selected `A`, `B`, or `VOID`
- `UNRESOLVED`: evidence was not good enough yet, so resolution can be retried later
- `CANCELLED`: market was cancelled before ordinary settlement

## Structured Verdict Output

The contract stores a structured resolution object like this:

```json
{
  "winner": "A",
  "confidence": 87,
  "evidence_summary": [
    "Source 1 confirms the official final result.",
    "Source 2 independently reports the same outcome."
  ],
  "source_urls_checked": [
    "https://example.com/source-1",
    "https://example.com/source-2"
  ],
  "reasoning": "The market resolves YES if the event occurred before the deadline. The listed sources confirm it did.",
  "void_reason": ""
}
```

Allowed winners:

- `A`
- `B`
- `VOID`
- `UNRESOLVED`

## GenLayer-Specific Design

VERDIKT uses the part of GenLayer that actually matters here:

- non-deterministic web access for evidence gathering
- non-deterministic prompt execution for evidence interpretation
- validator consensus over the result
- on-chain settlement based on that consensus outcome

That means the Intelligent Contract owns the exact decision that moves money.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Create `.env.local`:

```env
NEXT_PUBLIC_GENLAYER_CHAIN=studio
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x1883b4d551e0103B2b482EA862F7612511210150
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

## Deployed Contract

Network: Studionet (chainId 61999, `studio.genlayer.com/api`)

Contract address: `0x1883b4d551e0103B2b482EA862F7612511210150`

This is the production contract used by the live app. It includes:

- safe web source fetching with per-source error handling (no single bad URL crashes resolution)
- safe `response.body` normalization for both `bytes` and `str` returns from the GenLayer web API
- `prompt_non_comparative` equivalence principle for LLM-based resolution consensus
- full parimutuel settlement, fee collection, and claim logic

## End-to-End Test Coverage

The contract has been tested end-to-end on Studionet using `scripts/test-all.mjs`. All 8 suites pass:

- happy path: suggestion approval, full lifecycle to `AWAITING_RESOLUTION`, cancellation with refund claim
- revert paths: admin-only guards, all input validation errors, phase and caller errors, lifecycle edge cases
- nondeterministic resolution: `trigger_resolution` completes consensus with a structured JSON verdict on-chain

Run the tests yourself:

```bash
GL_ADMIN_PK=<key> \
GL_USER1_PK=<key> \
GL_USER2_PK=<key> \
GL_USER3_PK=<key> \
GL_USER4_PK=<key> \
GL_CONTRACT_ADDRESS=0x1883b4d551e0103B2b482EA862F7612511210150 \
GL_RPC_ENDPOINT=https://studio.genlayer.com/api \
GL_CHAIN_ID=61999 \
node scripts/test-all.mjs
```

Pass suite names as arguments to run a subset: `node scripts/test-all.mjs nondet-resolution`

## Final Positioning

VERDIKT should be described as:

**A GenLayer-native evidence-resolved prediction market where outcomes are determined by validator consensus over trusted public evidence, not by an admin or backend oracle.**
