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
    .select("id, nama, email, no_telp, alamat, role, is_admin_utama, created_at")
    .eq("id", sesi.id)
    .maybeSingle();
  return (data as Profil | null) ?? null;
});

/** Apakah pengguna yang login adalah admin. */
export async function adalahAdmin(): Promise<boolean> {
  return (await getProfil())?.role === "admin";
}

/**
 * Admin tidak memakai halaman toko (beranda, katalog, keranjang, checkout, dll.) supaya tidak bisa
 * memesan untuk diri sendiri. Kalau admin membuka halaman toko, langsung diarahkan ke dashboard.
 */
export async function arahkanAdminKeDashboard(): Promise<void> {
  if (await adalahAdmin()) redirect("/admin");
}

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
  // Sudah masuk tapi bukan admin: tampilkan alasannya di halaman masuk admin, bukan dilempar diam-diam ke beranda.
  if (profil.role !== "admin") redirect("/admin/masuk?galat=bukan-admin");
  return profil;
}

/** Wajib admin utama (pengelola admin lain). Admin biasa dikembalikan ke dashboard. */
export async function wajibAdminUtama(): Promise<Profil> {
  const profil = await wajibAdmin();
  if (!profil.is_admin_utama) redirect("/admin");
  return profil;
}

export { amankanNext } from "./redirect-aman";
