import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { marketId, reason } = await req.json();
  if (!marketId || !reason) return NextResponse.json({ error: "marketId and reason required" }, { status: 400 });

  const demoUserId = "00000000-0000-0000-0000-000000000001";
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("disputes")
    .insert({ market_id: marketId, raised_by: demoUserId, reason })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dispute: data }, { status: 201 });
}
