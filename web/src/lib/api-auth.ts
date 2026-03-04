import { createSupabaseService } from "./supabase-service";

/**
 * In-memory rate limiter: 60 requests per minute per key hash.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 60) return false;
  entry.count++;
  return true;
}

export interface ApiAuthResult {
  userId: string;
  keyHash: string;
}

/**
 * Validate a Bearer token from the Authorization header.
 * Returns the user_id if valid, or an error response.
 */
export async function validateApiKey(
  request: Request
): Promise<ApiAuthResult | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith("insp_")) {
    return new Response(
      JSON.stringify({ error: "Invalid API key format" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Hash the key
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Rate limit check
  if (!checkRateLimit(keyHash)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded (60 req/min)" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Lookup in DB (service role — bypasses RLS)
  const supabase = createSupabaseService();
  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (error || !apiKey) {
    return new Response(
      JSON.stringify({ error: "Invalid or revoked API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then(() => {});

  return { userId: apiKey.user_id, keyHash };
}
