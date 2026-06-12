import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: NextRequest, { params }: { params: { marketId: string } }) {
  try {
    const supabase = createAdminClient();

    const [{ data: market, error }, { data: positions }] = await Promise.all([
      supabase.from("markets").select("*").eq("id", params.marketId).single(),
      supabase
        .from("positions")
        .select("id, side, amount, created_at, user_id")
        .eq("market_id", params.marketId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (error) throw error;
    return NextResponse.json({ market, positions: positions ?? [] });
  } catch {
    return NextResponse.json({ error: "Market not found or database not configured" }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { marketId: string } }) {
  const body = await req.json();
  const allowed = ["open", "locked", "resolving", "settled", "void"];
  if (body.status && !allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("markets")
      .update(body)
      .eq("id", params.marketId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ market: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
