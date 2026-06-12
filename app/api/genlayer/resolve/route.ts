import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { marketId, txHash, claimId } = await req.json();
  if (!marketId) return NextResponse.json({ error: "marketId required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: market, error } = await supabase
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .single();

  if (error || !market) return NextResponse.json({ error: "Market not found" }, { status: 404 });

  // Mark as resolving
  await supabase.from("markets").update({ status: "resolving" }).eq("id", marketId);

  try {
    // If txHash was provided (client-side transaction already submitted), use it
    if (txHash) {
      // Log the resolution — verdict will be synced when the transaction is finalized
      await supabase.from("resolution_logs").insert({
        market_id:       marketId,
        sources_read:    [],
        genlayer_input:  {
          market_id: marketId,
          title: market.title,
          claim_id: claimId ?? null,
          resolution_rule: market.resolution_rule,
        },
        genlayer_output: { status: "pending_finalization" },
        tx_hash:         txHash,
      });

      // Update market with tx hash
      await supabase.from("markets").update({
        genlayer_tx_hash: txHash,
      }).eq("id", marketId);

      return NextResponse.json({
        success: true,
        txHash,
        claimId: claimId ?? null,
        message: "Transaction submitted. Verdict will be finalized by GenLayer validators.",
      });
    }

    // No txHash means this is a server-initiated resolution (shouldn't happen in normal flow)
    return NextResponse.json({
      error: "Client must submit the transaction. Use the resolve button with a connected wallet.",
    }, { status: 400 });
  } catch (err: unknown) {
    await supabase.from("markets").update({ status: "locked" }).eq("id", marketId);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Resolution failed" }, { status: 500 });
  }
}
