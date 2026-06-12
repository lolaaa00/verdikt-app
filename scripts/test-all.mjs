import assert from "node:assert/strict";
import { createClient, chains } from "genlayer-js";
import { privateKeyToAccount } from "viem/accounts";

const requiredEnv = [
  "GL_ADMIN_PK",
  "GL_USER1_PK",
  "GL_USER2_PK",
  "GL_USER3_PK",
  "GL_USER4_PK",
  "GL_CONTRACT_ADDRESS",
  "GL_RPC_ENDPOINT",
  "GL_CHAIN_ID",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

const chain = {
  ...chains.studionet,
  id: Number(process.env.GL_CHAIN_ID),
  rpcUrls: {
    ...chains.studionet.rpcUrls,
    default: {
      ...chains.studionet.rpcUrls.default,
      http: [process.env.GL_RPC_ENDPOINT],
    },
  },
};

const CONTRACT_ADDRESS = process.env.GL_CONTRACT_ADDRESS;
const accounts = {
  admin: privateKeyToAccount(process.env.GL_ADMIN_PK),
  user1: privateKeyToAccount(process.env.GL_USER1_PK),
  user2: privateKeyToAccount(process.env.GL_USER2_PK),
  user3: privateKeyToAccount(process.env.GL_USER3_PK),
  user4: privateKeyToAccount(process.env.GL_USER4_PK),
};

const readClient = createClient({
  chain,
  endpoint: process.env.GL_RPC_ENDPOINT,
});

const clients = Object.fromEntries(
  Object.entries(accounts).map(([name, account]) => [
    name,
    createClient({
      chain,
      endpoint: process.env.GL_RPC_ENDPOINT,
      account,
    }),
  ]),
);

const selectedSuites = new Set(process.argv.slice(2));
const suiteResults = [];
let stopReason = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function uniq(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function argsSummary(args) {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg.length > 48 ? `${arg.slice(0, 45)}...` : arg;
      }
      return String(arg);
    })
    .join(", ");
}

function getLeaderReceipt(tx) {
  const receipts = tx?.consensus_data?.leader_receipt;
  if (Array.isArray(receipts)) {
    return receipts[0] ?? null;
  }
  return receipts ?? null;
}

function getExecutionResult(tx) {
  const leader = getLeaderReceipt(tx);
  return String(leader?.execution_result ?? "").toUpperCase();
}

function getFailureMessage(tx) {
  const leader = getLeaderReceipt(tx);
  const stderr = leader?.stderr;
  if (typeof stderr === "string" && stderr.trim()) {
    return stderr.trim().split(/\r?\n/).slice(-2).join("\n");
  }
  if (Array.isArray(stderr) && stderr.length) {
    return stderr.map(String).slice(-2).join("\n");
  }
  if (leader?.result && typeof leader.result === "object") {
    return JSON.stringify(leader.result);
  }
  if (leader?.genvm_result) {
    return String(leader.genvm_result);
  }
  if (tx?.txExecutionResultName) {
    return String(tx.txExecutionResultName);
  }
  return "No stderr available";
}

function isAcceptedExecution(tx) {
  const execution = getExecutionResult(tx);
  return execution === "SUCCESS" || execution === "ACCEPTED";
}

function isUndetermined(tx) {
  const execution = getExecutionResult(tx);
  const status = String(tx?.statusName ?? tx?.status ?? "").toUpperCase();
  return execution === "UNDETERMINED" || status === "UNDETERMINED";
}

async function readValue(functionName, args = []) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      });
    } catch (err) {
      lastErr = err;
      await sleep(5000);
    }
  }
  throw lastErr;
}

async function readJson(functionName, args = []) {
  return JSON.parse(await readValue(functionName, args));
}

async function getCounts() {
  const [marketCount, suggestionCount] = await Promise.all([
    readValue("get_market_count"),
    readValue("get_suggestion_count"),
  ]);
  return {
    marketCount: Number(marketCount),
    suggestionCount: Number(suggestionCount),
  };
}

async function getConfig() {
  return readJson("get_config");
}

async function waitUntil(timestampSec) {
  while (nowSec() <= Number(timestampSec)) {
    await sleep(3000);
  }
}

async function writeChecked({
  caller,
  functionName,
  args,
  value = 0n,
  expectedFailure = false,
}) {
  const client = clients[caller];
  const label = `${caller} ${functionName}(${argsSummary(args)})`;
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = Date.now();
    console.log(`-> ${label} [attempt ${attempt}]`);
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value,
      });

      await client.waitForTransactionReceipt({
        hash,
        retries: 200,
        interval: 3000,
      });

      const tx = await client.getTransaction({ hash });
      const elapsed = Date.now() - started;

      if (!isAcceptedExecution(tx)) {
        const message = getFailureMessage(tx);
        const err = new Error(`${functionName} failed on-chain: ${message}`);
        err.txHash = hash;
        err.tx = tx;

        if (expectedFailure) {
          console.log(`OK ${functionName} reverted as expected (${elapsed}ms) tx=${hash}`);
          return { hash, tx, failed: true, message };
        }

        if (attempt === 3 || isUndetermined(tx)) {
          throw err;
        }
        lastError = err;
      } else {
        if (expectedFailure) {
          throw new Error(`${functionName} unexpectedly succeeded on-chain. tx=${hash}`);
        }
        console.log(`OK ${functionName} (${elapsed}ms) tx=${hash}`);
        return { hash, tx, failed: false };
      }
    } catch (error) {
      lastError = error;
      if (attempt === 3) {
        break;
      }
      await sleep(5000);
    }
  }

  throw lastError;
}

async function expectRevert({
  caller,
  functionName,
  args,
  value = 0n,
  expectedMessageIncludes,
  verifyStateUnchanged,
}) {
  const before = verifyStateUnchanged ? await verifyStateUnchanged("before") : null;
  const result = await writeChecked({
    caller,
    functionName,
    args,
    value,
    expectedFailure: true,
  });

  if (expectedMessageIncludes) {
    console.log(`  revert message: ${JSON.stringify(result.message)}`);
    assert.match(result.message, expectedMessageIncludes, `Expected revert message for ${functionName}`);
  }

  if (verifyStateUnchanged) {
    const after = await verifyStateUnchanged("after");
    assert.deepEqual(after, before, `${functionName} changed state after revert`);
  }

  return result;
}

async function runSuite(name, fn) {
  if (selectedSuites.size > 0 && !selectedSuites.has(name)) {
    return;
  }

  const started = Date.now();
  console.log(`\n=== SUITE ${name} START ===`);
  try {
    await fn();
    const elapsed = Date.now() - started;
    suiteResults.push({ name, status: "PASS", ms: elapsed });
    console.log(`SUMMARY ${name}: PASS (${elapsed}ms)`);
  } catch (error) {
    const elapsed = Date.now() - started;
    suiteResults.push({ name, status: "FAIL", ms: elapsed });
    stopReason = { suite: name, error };
    console.error(`SUMMARY ${name}: FAIL (${elapsed}ms)`);
    throw error;
  }
}

async function step0Sanity() {
  console.log("\n=== STEP 0 SANITY ===");
  const [owner, marketCount] = await Promise.all([
    readValue("get_owner"),
    readValue("get_market_count"),
  ]);

  for (const [name, account] of Object.entries(accounts)) {
    const balance = await readClient.getBalance({ address: account.address });
    console.log(`wallet ${name} balance=${balance.toString()}`);
    if (balance === 0n) {
      throw new Error(`Sanity check failed: wallet ${name} has zero balance`);
    }
  }

  console.log(`contract owner=${owner}`);
  console.log(`market_count=${String(marketCount)}`);
}

async function suiteHappySuggestionApproval() {
  const before = await getCounts();
  const closeTs = BigInt(nowSec() + 180);
  const resolutionAvailableTs = BigInt(nowSec() + 240);
  const title = uniq("suggestion-market");

  await writeChecked({
    caller: "user1",
    functionName: "suggest_market",
    args: [
      title,
      "YES",
      "NO",
      `Did ${title} happen?`,
      "Resolve YES if the title exists in the market and NO otherwise.",
      JSON.stringify(["https://example.com"]),
      closeTs,
      resolutionAvailableTs,
      "Void if the trusted source is unavailable.",
      "static web page",
    ],
  });

  const afterSuggest = await getCounts();
  assert.equal(afterSuggest.suggestionCount, before.suggestionCount + 1, "suggestion_count did not increment");
  const suggestionId = before.suggestionCount;
  const suggestion = await readJson("get_suggestion", [suggestionId]);
  assert.equal(suggestion.status, "SUGGESTED");
  assert.equal(suggestion.title, title);

  await writeChecked({
    caller: "admin",
    functionName: "approve_suggestion",
    args: [BigInt(suggestionId)],
  });

  const approvedSuggestion = await readJson("get_suggestion", [suggestionId]);
  const afterApprove = await getCounts();
  assert.equal(afterApprove.marketCount, before.marketCount + 1, "market_count did not increment after approval");
  assert.equal(approvedSuggestion.status, "APPROVED");
  assert.equal(approvedSuggestion.approved_market_id, before.marketCount);

  const market = await readJson("get_market", [before.marketCount]);
  assert.equal(market.title, title);
  assert.equal(market.status, "PENDING_LIQUIDITY");
  assert.equal(market.suggestion_id, suggestionId);
}

async function suiteHappyLifecycleAwaitingResolution() {
  const before = await getCounts();
  const cfg = await getConfig();
  const amount = BigInt(Math.max(Number(cfg.min_stake_wei), Number(cfg.min_side_liquidity_wei), 1));
  const closeTs = BigInt(nowSec() + 240);
  const resolutionAvailableTs = BigInt(nowSec() + 360);
  const title = uniq("lifecycle-market");

  await writeChecked({
    caller: "admin",
    functionName: "create_market",
    args: [
      title,
      "SIDE_A",
      "SIDE_B",
      `Did ${title} resolve to side A?`,
      "Resolve SIDE_A if the trusted source says the title exists. Otherwise resolve SIDE_B.",
      JSON.stringify(["https://example.com"]),
      closeTs,
      resolutionAvailableTs,
      "Void if the source is unavailable.",
      "static web page",
    ],
  });

  const marketId = before.marketCount;
  let market = await readJson("get_market", [marketId]);
  assert.equal(market.status, "PENDING_LIQUIDITY");

  await writeChecked({
    caller: "user1",
    functionName: "place_bet",
    args: [BigInt(marketId), "A"],
    value: amount,
  });

  market = await readJson("get_market", [marketId]);
  assert.equal(market.status, "PENDING_LIQUIDITY");
  assert.equal(BigInt(market.pool_a), amount);

  await writeChecked({
    caller: "user2",
    functionName: "place_bet",
    args: [BigInt(marketId), "B"],
    value: amount,
  });

  market = await readJson("get_market", [marketId]);
  assert.equal(market.status, "ACTIVE");
  assert.equal(BigInt(market.pool_b), amount);

  await waitUntil(closeTs);

  await writeChecked({
    caller: "user3",
    functionName: "close_market",
    args: [BigInt(marketId)],
  });

  market = await readJson("get_market", [marketId]);
  assert.equal(market.status, "AWAITING_RESOLUTION");
  assert.equal(market.title, title);
}

async function suiteHappyCancellationRefund() {
  const before = await getCounts();
  const cfg = await getConfig();
  const amount = BigInt(Math.max(Number(cfg.min_stake_wei), 1));
  const closeTs = BigInt(nowSec() + 180);
  const resolutionAvailableTs = BigInt(nowSec() + 300);
  const title = uniq("refund-market");

  await writeChecked({
    caller: "admin",
    functionName: "create_market",
    args: [
      title,
      "A_ONLY",
      "B_ONLY",
      `Did ${title} resolve?`,
      "Resolve A_ONLY if the source says the title exists.",
      JSON.stringify(["https://example.com"]),
      closeTs,
      resolutionAvailableTs,
      "Void if unavailable.",
      "static web page",
    ],
  });

  const marketId = before.marketCount;
  await writeChecked({
    caller: "user1",
    functionName: "place_bet",
    args: [BigInt(marketId), "A"],
    value: amount,
  });

  await waitUntil(closeTs);

  await writeChecked({
    caller: "user2",
    functionName: "close_market",
    args: [BigInt(marketId)],
  });

  const market = await readJson("get_market", [marketId]);
  assert.equal(market.status, "CANCELLED");
  assert.equal(market.winner, "VOID");

  const beforeClaim = await readJson("get_user_position", [marketId, accounts.user1.address]);
  assert.equal(beforeClaim.claimed, false);

  await writeChecked({
    caller: "user1",
    functionName: "claim",
    args: [BigInt(marketId)],
  });

  const afterClaim = await readJson("get_user_position", [marketId, accounts.user1.address]);
  assert.equal(afterClaim.claimed, true);
}

async function suiteRevertAdminPermissions() {
  await expectRevert({
    caller: "user1",
    functionName: "create_market",
    args: [
      uniq("bad-admin-create"),
      "A",
      "B",
      "Did this happen at all?",
      "Resolve A if the source says yes.",
      JSON.stringify(["https://example.com"]),
      BigInt(nowSec() + 120),
      BigInt(nowSec() + 150),
      "Void if unavailable.",
      "web",
    ],
    expectedMessageIncludes: /only_owner/i,
    verifyStateUnchanged: async () => getCounts(),
  });

  await expectRevert({
    caller: "user1",
    functionName: "set_config",
    args: [1n, 1n, 1n],
    expectedMessageIncludes: /only_owner/i,
    verifyStateUnchanged: async () => readJson("get_config"),
  });

  await expectRevert({
    caller: "user1",
    functionName: "transfer_ownership",
    args: [accounts.user2.address],
    expectedMessageIncludes: /only_owner/i,
    verifyStateUnchanged: async () => readValue("get_owner"),
  });

  await expectRevert({
    caller: "user1",
    functionName: "withdraw_protocol_fees",
    args: [accounts.user2.address, 1n],
    expectedMessageIncludes: /only_owner/i,
    verifyStateUnchanged: async () => Number(await readValue("get_protocol_fees")),
  });
}

async function suiteRevertValidationInputs() {
  const baseArgs = [
    "VALID TITLE",
    "YES",
    "NO",
    "Did a valid thing happen?",
    "Resolve YES if the source confirms it.",
    JSON.stringify(["https://example.com"]),
    BigInt(nowSec() + 180),
    BigInt(nowSec() + 240),
    "Void if the source is unavailable.",
    "web source",
  ];

  const cases = [
    { mutate: (args) => { args[0] = "bad"; }, expect: /title_too_short/i },
    { mutate: (args) => { args[2] = "YES"; }, expect: /duplicate_sides/i },
    { mutate: (args) => { args[3] = "short"; }, expect: /resolution_question_too_short/i },
    { mutate: (args) => { args[4] = "short"; }, expect: /resolution_rule_too_short/i },
    { mutate: (args) => { args[8] = "short"; }, expect: /void_conditions_too_short/i },
    { mutate: (args) => { args[9] = "x"; }, expect: /evidence_type_too_short/i },
    { mutate: (args) => { args[6] = BigInt(nowSec() - 10); }, expect: /close_time_must_be_future/i },
    {
      mutate: (args) => {
        args[6] = BigInt(nowSec() + 600);
        args[7] = BigInt(nowSec() + 300);
      },
      expect: /resolution_available_before_close/i,
    },
  ];

  for (const testCase of cases) {
    const args = [...baseArgs];
    testCase.mutate(args);
    await expectRevert({
      caller: "user1",
      functionName: "suggest_market",
      args,
      expectedMessageIncludes: testCase.expect,
      verifyStateUnchanged: async () => getCounts(),
    });
  }

  await expectRevert({
    caller: "admin",
    functionName: "set_config",
    args: [1001n, 1n, 1n],
    expectedMessageIncludes: /fee_too_high/i,
    verifyStateUnchanged: async () => readJson("get_config"),
  });

  await expectRevert({
    caller: "admin",
    functionName: "set_config",
    args: [1n, 0n, 1n],
    expectedMessageIncludes: /min_stake_too_low/i,
    verifyStateUnchanged: async () => readJson("get_config"),
  });

  await expectRevert({
    caller: "admin",
    functionName: "set_config",
    args: [1n, 1n, 0n],
    expectedMessageIncludes: /min_side_liquidity_too_low/i,
    verifyStateUnchanged: async () => readJson("get_config"),
  });

  await expectRevert({
    caller: "admin",
    functionName: "transfer_ownership",
    args: ["bad"],
    expectedMessageIncludes: /invalid_owner/i,
    verifyStateUnchanged: async () => readValue("get_owner"),
  });
}

async function suiteRevertPhaseAndCaller() {
  const before = await getCounts();
  const cfg = await getConfig();
  const amount = BigInt(Math.max(Number(cfg.min_stake_wei), Number(cfg.min_side_liquidity_wei), 1));
  const closeTs = BigInt(nowSec() + 180);
  const resolutionAvailableTs = BigInt(nowSec() + 360);
  const title = uniq("revert-phase-market");

  await writeChecked({
    caller: "admin",
    functionName: "create_market",
    args: [
      title,
      "LEFT",
      "RIGHT",
      `Did ${title} happen?`,
      "Resolve LEFT if source confirms the title.",
      JSON.stringify(["https://example.com"]),
      closeTs,
      resolutionAvailableTs,
      "Void if unavailable.",
      "static web page",
    ],
  });

  const marketId = before.marketCount;

  await expectRevert({
    caller: "user1",
    functionName: "place_bet",
    args: [BigInt(marketId), "C"],
    value: amount,
    expectedMessageIncludes: /invalid_side/i,
    verifyStateUnchanged: async () => readJson("get_market", [marketId]),
  });

  await expectRevert({
    caller: "user1",
    functionName: "place_bet",
    args: [BigInt(marketId), "A"],
    value: 0n,
    expectedMessageIncludes: /stake_below_minimum/i,
    verifyStateUnchanged: async () => readJson("get_market", [marketId]),
  });

  await expectRevert({
    caller: "user1",
    functionName: "close_market",
    args: [BigInt(marketId)],
    expectedMessageIncludes: /market_not_closed_yet/i,
    verifyStateUnchanged: async () => readJson("get_market", [marketId]),
  });

  await expectRevert({
    caller: "user1",
    functionName: "trigger_resolution",
    args: [BigInt(marketId)],
    expectedMessageIncludes: /market_not_ready_for_resolution/i,
    verifyStateUnchanged: async () => readJson("get_market", [marketId]),
  });

  await expectRevert({
    caller: "user1",
    functionName: "claim",
    args: [BigInt(marketId)],
    expectedMessageIncludes: /no_position/i,
    verifyStateUnchanged: async () => readJson("get_user_position", [marketId, accounts.user1.address]),
  });

  await writeChecked({
    caller: "user1",
    functionName: "place_bet",
    args: [BigInt(marketId), "A"],
    value: amount,
  });

  await writeChecked({
    caller: "user2",
    functionName: "place_bet",
    args: [BigInt(marketId), "B"],
    value: amount,
  });

  await waitUntil(closeTs);

  await writeChecked({
    caller: "user3",
    functionName: "close_market",
    args: [BigInt(marketId)],
  });

  await expectRevert({
    caller: "user1",
    functionName: "claim",
    args: [BigInt(marketId)],
    expectedMessageIncludes: /market_not_claimable/i,
    verifyStateUnchanged: async () => readJson("get_user_position", [marketId, accounts.user1.address]),
  });

  await expectRevert({
    caller: "user2",
    functionName: "trigger_resolution",
    args: [BigInt(marketId)],
    expectedMessageIncludes: /resolution_evidence_not_ready/i,
    verifyStateUnchanged: async () => readJson("get_market", [marketId]),
  });
}

async function suiteRevertLifecycleEdges() {
  const beforeSuggestion = await getCounts();
  const suggestionCloseTs = BigInt(nowSec() + 180);
  const suggestionResolutionAvailableTs = BigInt(nowSec() + 240);
  const suggestionTitle = uniq("revert-suggestion");

  await writeChecked({
    caller: "user1",
    functionName: "suggest_market",
    args: [
      suggestionTitle,
      "YES",
      "NO",
      `Did ${suggestionTitle} happen?`,
      "Resolve YES if the trusted source confirms the title.",
      JSON.stringify(["https://example.com"]),
      suggestionCloseTs,
      suggestionResolutionAvailableTs,
      "Void if the source is unavailable.",
      "web source",
    ],
  });

  const suggestionId = beforeSuggestion.suggestionCount;
  await writeChecked({
    caller: "admin",
    functionName: "reject_suggestion",
    args: [BigInt(suggestionId), "duplicate moderation path test"],
  });

  await expectRevert({
    caller: "admin",
    functionName: "approve_suggestion",
    args: [BigInt(suggestionId)],
    expectedMessageIncludes: /suggestion_not_pending/i,
    verifyStateUnchanged: async () => readJson("get_suggestion", [suggestionId]),
  });

  await expectRevert({
    caller: "admin",
    functionName: "reject_suggestion",
    args: [BigInt(suggestionId), "already rejected"],
    expectedMessageIncludes: /suggestion_not_pending/i,
    verifyStateUnchanged: async () => readJson("get_suggestion", [suggestionId]),
  });

  const beforeCancel = await getCounts();
  const cancelCloseTs = BigInt(nowSec() + 120);
  const cancelResolutionAvailableTs = BigInt(nowSec() + 240);
  const cancelTitle = uniq("cancel-final");

  await writeChecked({
    caller: "admin",
    functionName: "create_market",
    args: [
      cancelTitle,
      "YES",
      "NO",
      `Did ${cancelTitle} happen?`,
      "Resolve YES if the trusted source confirms the title.",
      JSON.stringify(["https://example.com"]),
      cancelCloseTs,
      cancelResolutionAvailableTs,
      "Void if the source is unavailable.",
      "web source",
    ],
  });

  const cancelMarketId = beforeCancel.marketCount;
  await writeChecked({
    caller: "admin",
    functionName: "cancel_market",
    args: [BigInt(cancelMarketId), "admin lifecycle edge test"],
  });

  await expectRevert({
    caller: "admin",
    functionName: "cancel_market",
    args: [BigInt(cancelMarketId), "cannot cancel twice"],
    expectedMessageIncludes: /market_already_final/i,
    verifyStateUnchanged: async () => readJson("get_market", [cancelMarketId]),
  });

  await expectRevert({
    caller: "user2",
    functionName: "trigger_resolution",
    args: [BigInt(cancelMarketId)],
    expectedMessageIncludes: /market_already_final/i,
    verifyStateUnchanged: async () => readJson("get_market", [cancelMarketId]),
  });

  await expectRevert({
    caller: "admin",
    functionName: "withdraw_protocol_fees",
    args: [accounts.user1.address, 0n],
    expectedMessageIncludes: /invalid_amount/i,
    verifyStateUnchanged: async () => Number(await readValue("get_protocol_fees")),
  });

  await expectRevert({
    caller: "admin",
    functionName: "withdraw_protocol_fees",
    args: [accounts.user1.address, 1n],
    expectedMessageIncludes: /amount_exceeds_protocol_fees/i,
    verifyStateUnchanged: async () => Number(await readValue("get_protocol_fees")),
  });
}

async function suiteNondetResolution() {
  const before = await getCounts();
  const cfg = await getConfig();
  const amount = BigInt(Math.max(Number(cfg.min_stake_wei), Number(cfg.min_side_liquidity_wei), 1));
  const closeTs = BigInt(nowSec() + 180);
  const resolutionAvailableTs = BigInt(nowSec() + 300);
  const title = uniq("nondet-market");

  await writeChecked({
    caller: "admin",
    functionName: "create_market",
    args: [
      title,
      "PAGE_HAS_EXAMPLE_DOMAIN",
      "PAGE_DOES_NOT_HAVE_EXAMPLE_DOMAIN",
      "Does the trusted source contain the phrase Example Domain?",
      "Resolve side A if the trusted source content includes the phrase Example Domain. Resolve side B otherwise. Void only if the source is unavailable.",
      JSON.stringify(["https://example.com"]),
      closeTs,
      resolutionAvailableTs,
      "Void if the source cannot be fetched.",
      "static web page",
    ],
  });

  const marketId = before.marketCount;

  await writeChecked({
    caller: "user1",
    functionName: "place_bet",
    args: [BigInt(marketId), "A"],
    value: amount,
  });

  await writeChecked({
    caller: "user2",
    functionName: "place_bet",
    args: [BigInt(marketId), "B"],
    value: amount,
  });

  await waitUntil(closeTs);

  await writeChecked({
    caller: "user3",
    functionName: "close_market",
    args: [BigInt(marketId)],
  });

  await waitUntil(resolutionAvailableTs);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await writeChecked({
        caller: "user4",
        functionName: "trigger_resolution",
        args: [BigInt(marketId)],
      });

      if (isUndetermined(result.tx)) {
        throw new Error(`UNDETERMINED nondeterministic result on tx ${result.hash}`);
      }

      const market = await readJson("get_market", [marketId]);
      assert.ok(["RESOLVED", "UNRESOLVED"].includes(market.status), "unexpected post-resolution status");
      assert.ok(market.resolution_details, "missing resolution_details");

      const details = market.resolution_details;
      JSON.parse(JSON.stringify(details));
      assert.ok(["A", "B", "VOID", "UNRESOLVED"].includes(details.winner), "winner enum invalid");
      assert.ok(Number.isInteger(details.confidence), "confidence is not integer");
      assert.ok(details.confidence >= 0 && details.confidence <= 100, "confidence out of range");
      assert.ok(Array.isArray(details.evidence_summary), "evidence_summary is not an array");
      assert.ok(Array.isArray(details.source_urls_checked), "source_urls_checked is not an array");
      assert.equal(typeof details.reasoning, "string");
      assert.ok(details.reasoning.length > 0, "reasoning empty");
      if (details.winner === "VOID") {
        assert.ok(details.void_reason.length > 0, "void_reason empty");
      }
      return;
    } catch (error) {
      if (attempt === 2) {
        throw new Error(
          `Nondeterministic resolution failed after 2 attempts. This likely indicates gl.eq_principle.strict_eq is being used on LLM-generated JSON, which is too unstable for byte-identical consensus. Last error=${error.message}`,
        );
      }
      if (!String(error.message).includes("UNDETERMINED")) {
        throw error;
      }
      await sleep(5000);
    }
  }
}

async function main() {
  const totalStarted = Date.now();
  try {
    await step0Sanity();
    await runSuite("happy-suggestion-approval", suiteHappySuggestionApproval);
    await runSuite("happy-lifecycle-awaiting-resolution", suiteHappyLifecycleAwaitingResolution);
    await runSuite("happy-cancellation-refund", suiteHappyCancellationRefund);
    await runSuite("revert-admin-permissions", suiteRevertAdminPermissions);
    await runSuite("revert-validation-inputs", suiteRevertValidationInputs);
    await runSuite("revert-phase-and-caller", suiteRevertPhaseAndCaller);
    await runSuite("revert-lifecycle-edges", suiteRevertLifecycleEdges);
    await runSuite("nondet-resolution", suiteNondetResolution);

    console.log("\n=== FINAL SUMMARY ===");
    for (const result of suiteResults) {
      console.log(`${result.status} ${result.name} ${result.ms}ms`);
    }
    console.log(`contract=${CONTRACT_ADDRESS}`);
    console.log(`network=studionet chainId=${chain.id}`);
    console.log(`totalMs=${Date.now() - totalStarted}`);
  } catch (error) {
    console.error("\n=== FINAL SUMMARY ===");
    for (const result of suiteResults) {
      console.log(`${result.status} ${result.name} ${result.ms}ms`);
    }
    if (stopReason) {
      console.error(`failedSuite=${stopReason.suite}`);
    }
    console.error(`contract=${CONTRACT_ADDRESS}`);
    console.error(`network=studionet chainId=${chain.id}`);
    if (error?.txHash) {
      console.error(`txHash=${error.txHash}`);
    }
    if (error?.tx) {
      console.error(`executionResult=${getExecutionResult(error.tx)}`);
      console.error(`stderr=${JSON.stringify(getFailureMessage(error.tx))}`);
    }
    console.error(`error=${error.message}`);
    process.exit(1);
  }
}

main();
