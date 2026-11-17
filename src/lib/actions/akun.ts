"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSesi } from "@/lib/auth";
import type { FormState } from "@/lib/types";

const skemaProfil = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  no_telp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => v === "" || /^\+?[0-9]{8,14}$/.test(v), "Nomor telepon tidak valid"),
  alamat: z.string().trim().max(500, "Alamat maksimal 500 karakter"),
});

export async function simpanProfil(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk?next=/akun");

  const hasil = skemaProfil.safeParse({
    nama: formData.get("nama") ?? "",
    no_telp: formData.get("no_telp") ?? "",
    alamat: formData.get("alamat") ?? "",
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nama: hasil.data.nama,
      no_telp: hasil.data.no_telp || null,
      alamat: hasil.data.alamat || null,
    })
    .eq("id", sesi.id);
  if (error) return { error: "Gagal menyimpan profil. Coba lagi." };

  revalidatePath("/", "layout");
  return { ok: "Profil tersimpan." };
}

export async function tandaiSemuaDibaca(): Promise<void> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk");
  const supabase = await createClient();
  await supabase.from("notifikasi").update({ is_dibaca: true }).eq("id_user", sesi.id).eq("is_dibaca", false);
  revalidatePath("/", "layout");
}
