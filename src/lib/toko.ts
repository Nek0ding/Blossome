import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { TAG_KATALOG } from "./data";
import type { PengaturanToko } from "./types";

const pengaturanCache = unstable_cache(
  async (): Promise<PengaturanToko> => {
    const { data, error } = await createPublicClient().from("pengaturan_toko").select("*").eq("id", 1).single();
    if (error || !data) {
      // Error tidak ikut di-cache, jadi request berikutnya mencoba lagi.
      throw new Error("Pengaturan toko belum bisa dibaca. Pastikan migrasi database sudah dijalankan dan kunci Supabase benar.");
    }
    return data as PengaturanToko;
  },
  ["blossome", "pengaturan-toko"],
  { tags: [TAG_KATALOG], revalidate: 300 },
);

/** Pengaturan toko (satu baris). Di-cache di server sampai admin mengubahnya. */
export const getPengaturan = cache(async (): Promise<PengaturanToko> => {
  // Halaman tetap dirender per request (bukan dibekukan saat build); datanya saja yang di-cache.
  await connection();
  return pengaturanCache();
});

/** Alamat dasar website, dipakai untuk link di email dan redirect auth. */
export async function getOrigin(): Promise<string> {
  const dariEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  // Di production pakai alamat resmi dari env supaya link di email tidak bisa dibelokkan lewat header Host.
  if (dariEnv && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(dariEnv)) return dariEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return dariEnv || "http://localhost:3000";
}
