import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "00000000-0000-0000-0000-000000000001";
  const filter = searchParams.get("filter") ?? "all";

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("positions")
    .select("*, market:markets(id, title, status, winner_side, side_a, side_b, verdict_summary, genlayer_tx_hash, category)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type PositionWithMarket = {
    side: string;
    market: { winner_side: string | null; status: string } | null;
  };

  let positions = (data ?? []) as PositionWithMarket[];
  if (filter === "won")     positions = positions.filter((p) => p.market?.winner_side === p.side && p.market?.status === "settled");
  if (filter === "lost")    positions = positions.filter((p) => p.market?.winner_side !== p.side && p.market?.status === "settled" && p.market?.winner_side !== null);
  if (filter === "pending") positions = positions.filter((p) => ["open", "locked", "resolving"].includes(p.market?.status ?? ""));

  return NextResponse.json({ positions });
}
