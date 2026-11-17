import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profil } from "./types";

export interface Sesi {
  id: string;
  email: string;
}

/** Pengguna yang sedang login (token diverifikasi), atau null. */
export const getSesi = cache(async (): Promise<Sesi | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: String(claims.sub), email: typeof claims.email === "string" ? claims.email : "" };
});

/** Baris profiles milik pengguna yang sedang login, atau null. */
export const getProfil = cache(async (): Promise<Profil | null> => {
  const sesi = await getSesi();
  if (!sesi) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nama, email, no_telp, alamat, role, created_at")
    .eq("id", sesi.id)
    .maybeSingle();
  return (data as Profil | null) ?? null;
});

/** Wajib login. Kalau belum, arahkan ke halaman masuk. */
export async function wajibLogin(next?: string): Promise<Sesi> {
  const sesi = await getSesi();
  if (!sesi) redirect(next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk");
  return sesi;
}

/** Wajib admin. Dipanggil di layout admin dan di setiap server action admin. */
export async function wajibAdmin(): Promise<Profil> {
  const profil = await getProfil();
  if (!profil) redirect("/admin/masuk");
  if (profil.role !== "admin") redirect("/");
  return profil;
}

export { amankanNext } from "./redirect-aman";
