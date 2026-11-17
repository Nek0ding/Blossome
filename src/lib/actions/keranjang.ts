"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adalahAdmin, getSesi } from "@/lib/auth";
import { pesanDb } from "@/lib/galat";
import type { FormState } from "@/lib/types";

function bilangan(nilai: FormDataEntryValue | null, cadangan = 0): number {
  const teks = String(nilai ?? "").trim();
  if (!/^\d{1,9}$/.test(teks)) return cadangan;
  return Number(teks);
}

export async function tambahKeKeranjang(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get("slug") ?? "");
  const sesi = await getSesi();
  if (!sesi) redirect(`/masuk?next=${encodeURIComponent(`/produk/${slug}`)}`);
  if (await adalahAdmin()) return { error: "Akun admin tidak bisa berbelanja. Gunakan akun pelanggan." };

  const idProduk = bilangan(formData.get("id_produk"));
  const jumlah = bilangan(formData.get("jumlah"), 1);
  if (idProduk <= 0 || jumlah < 1 || jumlah > 99) return { error: "Jumlah harus antara 1 dan 99." };

  // Addon dikirim sebagai addon_<id> = jumlah
  const addons: { id_addon: number; jumlah: number }[] = [];
  for (const [kunci, nilai] of formData.entries()) {
    if (!kunci.startsWith("addon_")) continue;
    const idAddon = bilangan(kunci.slice(6));
    const qty = bilangan(nilai);
    if (idAddon <= 0 || qty <= 0) continue;
    if (qty > 99) return { error: "Jumlah addon maksimal 99." };
    addons.push({ id_addon: idAddon, jumlah: qty });
  }
  if (addons.length > 20) return { error: "Addon terlalu banyak." };

  // Item + addon disimpan dalam satu transaksi database (tidak ada keranjang setengah jadi).
  const supabase = await createClient();
  const { error } = await supabase.rpc("tambah_keranjang", {
    p_id_produk: idProduk,
    p_jumlah: jumlah,
    p_addons: addons,
  });
  if (error) return { error: pesanDb(error, "Gagal menambahkan ke keranjang. Coba lagi.") };

  revalidatePath("/", "layout");
  redirect("/keranjang");
}

export async function ubahJumlahKeranjang(formData: FormData): Promise<void> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk?next=/keranjang");
  const id = bilangan(formData.get("id"));
  if (id <= 0) return;
  const jumlah = Math.min(99, Math.max(1, bilangan(formData.get("jumlah"), 1)));
  const supabase = await createClient();
  await supabase.from("keranjang_item").update({ jumlah }).eq("id_keranjang_item", id).eq("id_user", sesi.id);
  revalidatePath("/", "layout");
}

export async function hapusDariKeranjang(formData: FormData): Promise<void> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk?next=/keranjang");
  const id = bilangan(formData.get("id"));
  if (id <= 0) return;
  const supabase = await createClient();
  await supabase.from("keranjang_item").delete().eq("id_keranjang_item", id).eq("id_user", sesi.id);
  revalidatePath("/", "layout");
}
