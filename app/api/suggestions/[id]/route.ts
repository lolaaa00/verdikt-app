import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH — approve or reject a suggestion
 * When approved, auto-creates the market in the markets table.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { action } = body; // "approve" | "reject"

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Fetch the suggestion
    const { data: suggestion, error: sErr } = await supabase
      .from("suggestions")
      .select("*")
      .eq("id", params.id)
      .single();

    if (sErr || !suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (suggestion.status !== "pending") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    if (action === "reject") {
      await supabase
        .from("suggestions")
        .update({ status: "rejected" })
        .eq("id", params.id);

      return NextResponse.json({ status: "rejected" });
    }

    // Approve → create market
    const { data: market, error: mErr } = await supabase
      .from("markets")
      .insert({
        title: suggestion.title,
        description: suggestion.description || "",
        category: suggestion.category || "other",
        side_a: suggestion.side_a,
        side_b: suggestion.side_b,
        resolution_rule: suggestion.resolution_rule,
        resolution_sources: suggestion.resolution_sources || [],
        resolution_deadline: suggestion.resolution_deadline,
        status: "open",
        total_staked_a: 0,
        total_staked_b: 0,
        created_by: suggestion.suggested_by,
      })
      .select()
      .single();

    if (mErr) {
      console.error("Market creation error:", mErr);
      return NextResponse.json({ error: "Failed to create market" }, { status: 500 });
    }

    // Mark suggestion as approved with reference to the market
    await supabase
      .from("suggestions")
      .update({ status: "approved", market_id: market.id })
      .eq("id", params.id);

    return NextResponse.json({ status: "approved", market });
  } catch (e) {
    console.error("Approve error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
