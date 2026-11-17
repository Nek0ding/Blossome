"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { wajibAdminUtama } from "@/lib/auth";
import { pesanDb } from "@/lib/galat";
import { skemaEmail, skemaPassword } from "@/lib/validasi";
import type { FormState } from "@/lib/types";

const skemaId = z.string().uuid();

/** Jadikan akun admin, atau kembalikan admin menjadi pelanggan. Aturan lengkapnya dijaga di fungsi database. */
export async function ubahPeranAkun(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdminUtama();
  const id = skemaId.safeParse(formData.get("id_user"));
  const peran = formData.get("peran");
  if (!id.success || (peran !== "admin" && peran !== "customer")) return { error: "Data akun tidak valid." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ubah_peran_akun", { p_id_user: id.data, p_peran: peran });
  if (error) return { error: pesanDb(error, "Gagal mengubah peran akun. Coba lagi.") };

  revalidatePath("/admin", "layout");
  if ((data as { hasil?: string } | null)?.hasil === "tidak_berubah") return { ok: "Peran akun sudah sesuai." };
  return { ok: peran === "admin" ? "Akun berhasil dijadikan admin." : "Akses admin berhasil dicabut." };
}

const skemaAdminBaru = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: skemaEmail,
  password: skemaPassword,
});

/** Buat akun baru yang langsung menjadi admin (email langsung terverifikasi). */
export async function buatAdminBaru(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdminUtama();
  const hasil = skemaAdminBaru.safeParse({
    nama: formData.get("nama") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  if (formData.get("konfirmasi") !== hasil.data.password) return { error: "Konfirmasi password tidak sama." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "SUPABASE_SERVICE_ROLE_KEY belum diisi, jadi akun baru belum bisa dibuat dari sini." };
  }

  const { data: dibuat, error: errBuat } = await admin.auth.admin.createUser({
    email: hasil.data.email,
    password: hasil.data.password,
    email_confirm: true,
    user_metadata: { nama: hasil.data.nama },
  });
  if (errBuat || !dibuat.user) {
    const pesan = (errBuat?.message ?? "").toLowerCase();
    if (errBuat?.code === "email_exists" || pesan.includes("already") || pesan.includes("registered")) {
      return { error: "Email ini sudah terdaftar. Cari akunnya di bagian \"Jadikan akun yang ada sebagai admin\"." };
    }
    if (pesan.includes("weak") || pesan.includes("pwned")) {
      return { error: "Password terlalu mudah ditebak atau pernah bocor. Gunakan password lain." };
    }
    console.error("[kelola-admin] gagal membuat akun:", errBuat?.message);
    return { error: "Gagal membuat akun. Coba lagi." };
  }

  // Peran diubah lewat fungsi database yang sama (dicek: hanya admin utama)
  const supabase = await createClient();
  const { error: errPeran } = await supabase.rpc("ubah_peran_akun", { p_id_user: dibuat.user.id, p_peran: "admin" });
  if (errPeran) {
    // Jangan tinggalkan akun setengah jadi
    await admin.auth.admin.deleteUser(dibuat.user.id).catch(() => undefined);
    return { error: pesanDb(errPeran, "Akun gagal dijadikan admin. Coba lagi.") };
  }

  revalidatePath("/admin", "layout");
  return {
    ok: `Akun admin ${hasil.data.email} berhasil dibuat. Berikan password sementara ini ke pemiliknya dan minta ia menggantinya di menu Akun Saya.`,
  };
}
