import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * Client Supabase untuk Server Component, Server Action, dan Route Handler.
 * Berjalan sebagai pengguna yang sedang login, jadi semua query tetap dibatasi RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cookie tidak bisa ditulis di sini.
          // Aman diabaikan karena sesi diperbarui di proxy.ts.
        }
      },
    },
  });
}
