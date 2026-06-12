import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: NextRequest, { params }: { params: { marketId: string } }) {
  const supabase = createAdminClient();

  const [{ data: market }, { data: log }] = await Promise.all([
    supabase.from("markets").select("*").eq("id", params.marketId).single(),
    supabase
      .from("resolution_logs")
      .select("*")
      .eq("market_id", params.marketId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return NextResponse.json({ market, resolution_log: log ?? null });
}
