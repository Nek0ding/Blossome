"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { amankanNext } from "@/lib/auth";
import { getOrigin } from "@/lib/toko";
import type { FormState } from "@/lib/types";

const skemaEmail = z.string().trim().toLowerCase().email("Format email tidak valid");
const skemaPassword = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf")
  .regex(/[0-9]/, "Password harus mengandung angka");

function pesanAuth(pesan: string): string {
  const p = pesan.toLowerCase();
  if (p.includes("invalid login credentials")) return "Email atau password salah.";
  if (p.includes("already registered") || p.includes("already been registered")) return "Email ini sudah terdaftar. Silakan masuk.";
  if (p.includes("rate limit") || p.includes("security purposes")) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (p.includes("email address") && p.includes("invalid")) return "Alamat email tidak valid.";
  if (p.includes("expired") || p.includes("invalid")) return "Kode salah atau sudah kedaluwarsa. Minta kode baru.";
  if (p.includes("should be different")) return "Password baru harus berbeda dari password lama.";
  if (p.includes("error sending")) return "Email verifikasi gagal dikirim. Periksa pengaturan SMTP di Supabase.";
  if (p.includes("weak") || p.includes("pwned") || p.includes("easy to guess")) {
    return "Password ini terlalu mudah ditebak atau pernah bocor. Gunakan password lain.";
  }
  if (p.includes("signups not allowed") || p.includes("signup is disabled")) return "Pendaftaran sedang ditutup.";
  console.error("[auth]", pesan);
  return "Terjadi kesalahan. Coba lagi sebentar.";
}

export async function daftar(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = skemaEmail.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const password = skemaPassword.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (formData.get("konfirmasi") !== password.data) return { error: "Konfirmasi password tidak sama." };

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/` },
  });
  if (error) return { error: pesanAuth(error.message) };
  // Supabase mengembalikan user tanpa identitas kalau email sudah dipakai.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { error: "Email ini sudah terdaftar. Silakan masuk." };
  }
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }
  redirect(`/verifikasi?tipe=daftar&email=${encodeURIComponent(email.data)}`);
}

export async function verifikasiOtp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = skemaEmail.safeParse(formData.get("email"));
  if (!email.success) return { error: "Email tidak valid. Ulangi dari awal." };
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  if (token.length < 6) return { error: "Masukkan kode verifikasi dari email." };
  const tipe = formData.get("tipe") === "reset" ? "reset" : "daftar";

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token,
    type: tipe === "reset" ? "recovery" : "email",
  });
  if (error) return { error: pesanAuth(error.message) };

  revalidatePath("/", "layout");
  redirect(tipe === "reset" ? "/lupa-password/baru" : "/");
}

export async function kirimUlangKode(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = skemaEmail.safeParse(formData.get("email"));
  if (!email.success) return { error: "Email tidak valid. Ulangi dari awal." };
  const tipe = formData.get("tipe") === "reset" ? "reset" : "daftar";

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } =
    tipe === "reset"
      ? await supabase.auth.resetPasswordForEmail(email.data, {
          redirectTo: `${origin}/auth/confirm?next=/lupa-password/baru`,
        })
      : await supabase.auth.resend({
          type: "signup",
          email: email.data,
          options: { emailRedirectTo: `${origin}/auth/confirm?next=/` },
        });
  if (error) return { error: pesanAuth(error.message) };
  return { ok: "Kode baru sudah dikirim. Cek email kamu." };
}

export async function masuk(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = skemaEmail.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Password wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      redirect(`/verifikasi?tipe=daftar&email=${encodeURIComponent(email.data)}`);
    }
    return { error: pesanAuth(error.message) };
  }
  revalidatePath("/", "layout");
  redirect(amankanNext(formData.get("next")));
}

export async function masukGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const origin = await getOrigin();
  const next = amankanNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/masuk?galat=google");
  redirect(data.url);
}

export async function lupaPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = skemaEmail.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/confirm?next=/lupa-password/baru`,
  });
  if (error) return { error: pesanAuth(error.message) };
  redirect(`/verifikasi?tipe=reset&email=${encodeURIComponent(email.data)}`);
}

export async function aturPasswordBaru(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = skemaPassword.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (formData.get("konfirmasi") !== password.data) return { error: "Konfirmasi password tidak sama." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Sesi reset sudah habis. Ulangi dari halaman lupa password." };

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: pesanAuth(error.message) };
  revalidatePath("/", "layout");
  redirect("/akun?pesan=password-diubah");
}

export async function keluar(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function masukAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = skemaEmail.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Password wajib diisi." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error || !data.user) return { error: pesanAuth(error?.message ?? "Gagal masuk.") };

  const { data: profil } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profil?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Akun ini bukan akun admin." };
  }
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function keluarAdmin(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/masuk");
}
