import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET  — list suggestions (optionally filter by status)
 * POST — submit a new suggestion
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending | approved | rejected

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ suggestions: data });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title, description, category,
    side_a, side_b,
    resolution_rule, resolution_sources,
    resolution_deadline, wallet_address,
  } = body;

  if (!title || !side_a || !side_b || !resolution_rule || !resolution_deadline) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suggestions")
      .insert({
        title,
        description: description || "",
        category: category || "other",
        side_a,
        side_b,
        resolution_rule,
        resolution_sources: resolution_sources ?? [],
        resolution_deadline,
        suggested_by: wallet_address || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ suggestion: data }, { status: 201 });
  } catch (e) {
    console.error("Suggestion error:", e);
    return NextResponse.json({ error: "Failed to submit suggestion" }, { status: 500 });
  }
}
