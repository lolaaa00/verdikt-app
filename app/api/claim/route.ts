import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { positionId } = await req.json();
  if (!positionId) return NextResponse.json({ error: "positionId required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: position, error: pErr } = await supabase
    .from("positions")
    .select("*")
    .eq("id", positionId)
    .single();

  if (pErr || !position) return NextResponse.json({ error: "Position not found" }, { status: 404 });
  if (position.claimed) return NextResponse.json({ error: "Already claimed" }, { status: 400 });

  const { data: market } = await supabase
    .from("markets")
    .select("status, winner_side")
    .eq("id", position.market_id)
    .single();

  if (!market || market.status !== "settled") {
    return NextResponse.json({ error: "Market not settled" }, { status: 400 });
  }
  if (market.winner_side !== position.side) {
    return NextResponse.json({ error: "Position did not win" }, { status: 400 });
  }

  const mockClaimHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  await supabase.from("positions").update({ claimed: true, claim_tx_hash: mockClaimHash }).eq("id", positionId);
  return NextResponse.json({ success: true, claimTxHash: mockClaimHash, payout: position.potential_payout });
}
