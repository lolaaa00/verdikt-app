import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  // Get all users who have placed positions
  const { data: positions } = await supabase
    .from("positions")
    .select("user_id, side, amount, potential_payout, market:markets(id, status, winner_side)")
    .order("created_at", { ascending: false });

  if (!positions || positions.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  // Aggregate per user
  const userMap = new Map<string, {
    user_id: string;
    total_staked: number;
    total_won: number;
    correct: number;
    total_settled: number;
  }>();

  for (const p of positions) {
    const uid = p.user_id;
    if (!userMap.has(uid)) {
      userMap.set(uid, { user_id: uid, total_staked: 0, total_won: 0, correct: 0, total_settled: 0 });
    }
    const entry = userMap.get(uid)!;
    entry.total_staked += p.amount;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const market = p.market as any;
    if (market && market.status === "settled" && market.winner_side) {
      entry.total_settled += 1;
      if (p.side === market.winner_side) {
        entry.correct += 1;
        entry.total_won += p.potential_payout || 0;
      }
    }
  }

  // Get user profiles
  const userIds = Array.from(userMap.keys());
  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, wallet_address")
    .in("id", userIds);

  const userLookup = new Map((users || []).map(u => [u.id, u]));

  // Build leaderboard sorted by total_won desc
  const leaderboard = Array.from(userMap.values())
    .map((entry) => {
      const user = userLookup.get(entry.user_id);
      return {
        user_id: entry.user_id,
        name: user?.display_name || (user?.wallet_address ? `${user.wallet_address.slice(0, 6)}…${user.wallet_address.slice(-4)}` : "Anonymous"),
        wallet: user?.wallet_address || null,
        avatar_url: user?.avatar_url || null,
        correct: entry.correct,
        total_settled: entry.total_settled,
        win_rate: entry.total_settled > 0 ? Math.round((entry.correct / entry.total_settled) * 100) : 0,
        total_staked: entry.total_staked,
        total_won: entry.total_won,
      };
    })
    .sort((a, b) => b.total_won - a.total_won)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return NextResponse.json({ leaderboard });
}
