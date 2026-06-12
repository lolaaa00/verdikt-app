import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/profile?wallet=0x...
 * Fetch or create a user profile by wallet address.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const supabase = createAdminClient();

  // Try to find user by wallet
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", wallet.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ user: existing });
  }

  // Auto-create user on first connect
  const shortName = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      privy_user_id: wallet.toLowerCase(),
      wallet_address: wallet.toLowerCase(),
      display_name: shortName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: newUser }, { status: 201 });
}

/**
 * PATCH /api/profile
 * Update user profile (display_name, avatar_url).
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { wallet, display_name, avatar_url } = body;

  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const supabase = createAdminClient();

  const update: Record<string, string> = {};
  if (display_name !== undefined) update.display_name = display_name;
  if (avatar_url !== undefined) update.avatar_url = avatar_url;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("wallet_address", wallet.toLowerCase())
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
