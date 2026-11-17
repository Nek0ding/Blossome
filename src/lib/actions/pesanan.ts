"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { TAG_KATALOG } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getSesi } from "@/lib/auth";
import { pastikanPembayaran, terapkanStatusMidtrans, tutupTransaksiMenunggu } from "@/lib/pembayaran";
import { pesanDb } from "@/lib/galat";
import type { FormState } from "@/lib/types";

function teks(nilai: FormDataEntryValue | null): string {
  return String(nilai ?? "").trim();
}

/** Checkout: buat pesanan dari keranjang lewat fungsi database, lalu buat QRIS. */
export async function buatPesanan(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk?next=/checkout");

  const metode = teks(formData.get("metode")) === "ambil" ? "ambil" : "kirim";
  const idZona = Number.parseInt(teks(formData.get("id_zona")), 10);
  const tanggalKirim = teks(formData.get("tanggal_kirim"));
  const slot = teks(formData.get("slot_kirim"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalKirim)) return { error: "Pilih tanggal terlebih dahulu." };
  if (!slot) return { error: "Pilih slot waktu terlebih dahulu." };
  if (metode === "kirim" && !Number.isFinite(idZona)) {
    return { error: "Pilih area pengiriman. Kalau alamatmu di luar daftar, hubungi kami lewat WhatsApp." };
  }

  // Ucapan kartu dikirim sebagai ucapan_<id_keranjang_item> (maks. 30, sama dengan batas isi keranjang)
  const ucapan: Record<string, string> = {};
  for (const [kunci, nilai] of formData.entries()) {
    if (Object.keys(ucapan).length >= 30) break;
    const id = kunci.startsWith("ucapan_") ? kunci.slice("ucapan_".length) : "";
    if (/^\d{1,10}$/.test(id) && typeof nilai === "string" && nilai.trim()) {
      ucapan[id] = nilai.trim().slice(0, 300);
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buat_pesanan", {
    p_nama_penerima: teks(formData.get("nama_penerima")),
    p_no_telp_penerima: teks(formData.get("no_telp_penerima")).replace(/[\s-]/g, ""),
    p_metode: metode,
    p_id_zona: metode === "kirim" ? idZona : null,
    p_alamat: metode === "kirim" ? teks(formData.get("alamat")) : null,
    p_tanggal_kirim: tanggalKirim,
    p_slot_kirim: slot,
    p_catatan: teks(formData.get("catatan")).slice(0, 500),
    p_ucapan: ucapan,
  });
  if (error || !data) return { error: pesanDb(error, "Gagal membuat pesanan. Coba lagi.") };

  const hasil = data as { id_pesanan: number; kode_pesanan: string };
  updateTag(TAG_KATALOG); // stok berubah
  // Kalau QRIS gagal dibuat di sini, halaman bayar menyediakan tombol untuk mencoba lagi.
  await pastikanPembayaran(hasil.id_pesanan).catch((err) => console.error("[checkout] QRIS:", err));

  revalidatePath("/", "layout");
  redirect(`/pesanan/${hasil.kode_pesanan}/bayar`);
}

/** Pesanan milik pengguna yang sedang login. Admin pun hanya bisa memakai aksi ini untuk pesanannya sendiri. */
async function pesananSaya(kode: string, idUser: string) {
  const supabase = await createClient();
  if (!/^BLS-\d{5,10}$/.test(kode)) return { supabase, pesanan: null };
  const { data } = await supabase
    .from("pesanan")
    .select("id_pesanan, kode_pesanan, status")
    .eq("kode_pesanan", kode)
    .eq("id_user", idUser)
    .maybeSingle();
  return { supabase, pesanan: data as { id_pesanan: number; kode_pesanan: string; status: string } | null };
}

/** Buat QRIS baru untuk pesanan yang belum dibayar (dipakai tombol di halaman bayar). */
export async function buatQr(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk");
  const kode = teks(formData.get("kode"));
  const { pesanan } = await pesananSaya(kode, sesi.id);
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };

  try {
    const hasil = await pastikanPembayaran(pesanan.id_pesanan);
    revalidatePath(`/pesanan/${kode}`, "layout");
    if (!hasil.ok) return { error: hasil.pesan };
    return { ok: "QRIS siap dipindai." };
  } catch (err) {
    console.error("[bayar] gagal membuat QRIS:", err);
    return { error: "QRIS belum bisa dibuat. Coba lagi sebentar." };
  }
}

/** Tanyakan status terbaru ke Midtrans. Berguna kalau notifikasi webhook belum sampai. */
export async function cekStatusBayar(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk");
  const kode = teks(formData.get("kode"));
  const { supabase, pesanan } = await pesananSaya(kode, sesi.id);
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };

  const { data: bayar } = await supabase
    .from("pembayaran")
    .select("gateway_order_id")
    .eq("id_pesanan", pesanan.id_pesanan)
    .eq("status_bayar", "menunggu")
    .order("id_pembayaran", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!bayar) {
    revalidatePath(`/pesanan/${kode}`, "layout");
    return { ok: "Status sudah yang terbaru." };
  }

  try {
    const { hasil } = await terapkanStatusMidtrans(bayar.gateway_order_id);
    revalidatePath(`/pesanan/${kode}`, "layout");
    if (hasil === "lunas" || hasil === "sudah_diproses" || hasil === "perlu_tinjau") return { ok: "Pembayaran sudah diterima." };
    if (hasil === "pesanan_dibatalkan") return { error: "QRIS sudah kedaluwarsa dan pesanan dibatalkan." };
    return { ok: "Pembayaran belum kami terima. Selesaikan pembayaran lalu cek lagi." };
  } catch (err) {
    console.error("[bayar] gagal mengecek status:", err);
    return { error: "Status pembayaran belum bisa dicek. Coba lagi sebentar." };
  }
}

/** Customer membatalkan pesanannya sendiri selama belum dibayar. */
export async function batalkanPesananSaya(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesi = await getSesi();
  if (!sesi) redirect("/masuk");
  const kode = teks(formData.get("kode"));
  const { supabase, pesanan } = await pesananSaya(kode, sesi.id);
  if (!pesanan) return { error: "Pesanan tidak ditemukan." };
  if (pesanan.status !== "belum_dibayar") return { error: "Pesanan ini tidak bisa dibatalkan." };

  try {
    const { sudahDibayar } = await tutupTransaksiMenunggu(pesanan.id_pesanan);
    if (sudahDibayar) {
      revalidatePath(`/pesanan/${kode}`, "layout");
      return { error: "Pesanan ini ternyata sudah dibayar, jadi tidak dibatalkan." };
    }
  } catch (err) {
    console.error("[batal] gagal mengecek pembayaran:", err);
    return { error: "Status pembayaran belum bisa dicek. Coba lagi sebentar." };
  }

  const { error } = await supabase.rpc("batalkan_pesanan_saya", { p_id_pesanan: pesanan.id_pesanan });
  updateTag(TAG_KATALOG); // stok dikembalikan
  revalidatePath("/", "layout");
  if (error) return { error: pesanDb(error, "Gagal membatalkan pesanan. Coba lagi.") };
  return { ok: "Pesanan dibatalkan." };
}
