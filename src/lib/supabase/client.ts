"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase untuk komponen browser (realtime, upload gambar). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
