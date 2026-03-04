import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder";

/**
 * Service role Supabase client — bypasses RLS.
 * Only use server-side for API key validation and similar admin operations.
 */
export function createSupabaseService() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
