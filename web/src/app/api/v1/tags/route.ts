import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { createSupabaseService } from "@/lib/supabase-service";

/**
 * GET /api/v1/tags — List user's tags
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth instanceof Response) return auth;

  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, created_at")
    .eq("user_id", auth.userId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tags: data ?? [] });
}
