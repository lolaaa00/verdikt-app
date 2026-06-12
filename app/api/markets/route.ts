import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const status   = searchParams.get("status");
  const limit    = Number(searchParams.get("limit") ?? 50);

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("markets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category && category !== "all") query = query.eq("category", category);
    if (status)   query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ markets: data });
  } catch {
    // Graceful fallback when Supabase isn't configured
    return NextResponse.json({ markets: [], _fallback: true });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, side_a, side_b, resolution_rule, resolution_sources, resolution_deadline } = body;

  if (!title || !category || !side_a || !side_b || !resolution_rule || !resolution_deadline) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("markets")
      .insert({ title, description, category, side_a, side_b, resolution_rule, resolution_sources: resolution_sources ?? [], resolution_deadline })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ market: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database not configured. Connect Supabase to create markets." }, { status: 503 });
  }
}
