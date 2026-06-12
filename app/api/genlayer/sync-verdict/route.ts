import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readVerdict } from "@/lib/genlayer/client";

export async function POST(req: NextRequest) {
  const { marketId, claimId } = await req.json();
  if (!marketId || claimId === undefined) {
    return NextResponse.json({ error: "marketId and claimId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // Read the verdict from the on-chain contract
    const result = await readVerdict(claimId);

    if (!result || result.verdict === "not_found") {
      return NextResponse.json({
        synced: false,
        message: "Verdict not yet available on-chain. Validators may still be processing.",
      });
    }

    // Map the FactChecker verdict to our market schema
    const verdictMap: Record<string, string> = {
      true: "side_a",
      false: "side_b",
      unverifiable: "void",
    };

    const winnerSide = verdictMap[result.verdict] || null;
    const confidenceMap: Record<string, string> = {
      high: "HIGH",
      medium: "MEDIUM",
      low: "LOW",
    };

    // Update the market with the verdict
    const { error } = await supabase.from("markets").update({
      status:                winnerSide === "void" ? "void" : "settled",
      winner_side:           winnerSide === "void" ? null : winnerSide,
      verdict_summary:       result.reasoning || "Verdict delivered by GenLayer validators.",
      verdict_confidence:    confidenceMap[result.confidence] || "MEDIUM",
      verdict_evidence:      `Claim: "${result.claim}". Sources checked: ${result.sources ?? 0}.`,
      verdict_reason_codes:  result.verdict === "unverifiable"
        ? ["INSUFFICIENT_DATA"]
        : ["CLEAR_WINNER", "MULTI_SOURCE_CONFIRMED"],
    }).eq("id", marketId);

    if (error) throw error;

    // Update the resolution log
    await supabase.from("resolution_logs")
      .update({ genlayer_output: result })
      .eq("market_id", marketId);

    return NextResponse.json({
      synced: true,
      verdict: result,
      winnerSide,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to sync verdict",
    }, { status: 500 });
  }
}
