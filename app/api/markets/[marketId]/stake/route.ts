import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcMultiplier, calcPotentialPayout } from "@/lib/markets/odds";

export async function POST(req: NextRequest, { params }: { params: { marketId: string } }) {
  try {
    const body = await req.json();
    const { side, amount, wallet_address } = body;

    if (!side || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }
    if (!["side_a", "side_b"].includes(side)) {
      return NextResponse.json({ error: "Invalid side" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: market, error: mErr } = await supabase
      .from("markets")
      .select("*")
      .eq("id", params.marketId)
      .single();

    if (mErr || !market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
    if (market.status !== "open") return NextResponse.json({ error: "Market not open" }, { status: 400 });

    const newTotal      = market.total_staked_a + market.total_staked_b + amount;
    const mySideStaked  = (side === "side_a" ? market.total_staked_a : market.total_staked_b) + amount;
    const multiplier    = calcMultiplier(amount, mySideStaked, newTotal);
    const potentialPayout = calcPotentialPayout(amount, multiplier);

    // Look up user by wallet, auto-create if needed, fallback to demo
    let userId = "00000000-0000-0000-0000-000000000001";
    if (wallet_address) {
      const wallet = wallet_address.toLowerCase();
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", wallet)
        .single();
      if (user) {
        userId = user.id;
      } else {
        const shortName = wallet.slice(0, 6) + "..." + wallet.slice(-4);
        const { data: newUser } = await supabase
          .from("users")
          .insert({
            privy_user_id: wallet,
            wallet_address: wallet,
            display_name: shortName,
          })
          .select("id")
          .single();
        if (newUser) userId = newUser.id;
      }
    }

    const { data: position, error: pErr } = await supabase
      .from("positions")
      .insert({
        market_id: params.marketId,
        user_id: userId,
        side,
        amount,
        potential_payout: potentialPayout,
      })
      .select()
      .single();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    // Update totals
    const update = side === "side_a"
      ? { total_staked_a: market.total_staked_a + amount }
      : { total_staked_b: market.total_staked_b + amount };

    await supabase.from("markets").update(update).eq("id", params.marketId);

    return NextResponse.json({ position }, { status: 201 });
  } catch (err: unknown) {
    console.error("Stake error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
