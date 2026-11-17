import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * Client tanpa cookie (peran anon) untuk data publik katalog.
 * Karena tidak bergantung pada pengguna, hasilnya aman di-cache dan dipakai bersama.
 */
export function createPublicClient() {
  return createSupabaseClient(supabaseUrl(), supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
