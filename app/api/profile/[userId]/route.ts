import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: NextRequest, { params }: { params: { userId: string } }) {
  const supabase = createAdminClient();

  const [{ data: user }, { data: positions }] = await Promise.all([
    supabase.from("users").select("*").eq("id", params.userId).single(),
    supabase
      .from("positions")
      .select("*, market:markets(id, title, status, winner_side, side_a, side_b)")
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({ user, positions: positions ?? [] });
}
