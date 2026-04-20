import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only. If this key is ever exposed, rotate it in Supabase immediately; never ship to the client. */
export const isSupabaseServiceConfigured = (): boolean => {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
};

export const createSupabaseServiceRoleClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Supabase-backed storage.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};
