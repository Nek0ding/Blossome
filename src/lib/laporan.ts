import "server-only";

import { createClient } from "./supabase/server";
import type { MetodePengiriman, StatusPesanan, TipePesanan } from "./types";

export interface BarisPenjualan {
  dibayar_at: string;
  kode_pesanan: string;
  nama_pelanggan: string;
  email_pelanggan: string;
  item: string;
  tipe: TipePesanan;
  metode: MetodePengiriman;
  status: StatusPesanan;
  subtotal: number;
  ongkir: number;
  total: number;
}

const OFFSET_WIB = "+07:00";

/** Batas periode (inklusif) dalam WIB → ISO UTC. */
export function rentangWib(dari: string, sampai: string): { mulai: string; akhir: string } {
  const mulai = new Date(`${dari}T00:00:00${OFFSET_WIB}`);
  const akhir = new Date(`${sampai}T00:00:00${OFFSET_WIB}`);
  akhir.setUTCDate(akhir.getUTCDate() + 1);
  return { mulai: mulai.toISOString(), akhir: akhir.toISOString() };
}

/**
 * Penjualan masuk = pembayaran berstatus lunas dalam periode, dari pesanan yang tidak dibatalkan.
 * Tanggal mengikuti waktu pembayaran (dibayar_at).
 */
export async function getPenjualan(dari: string, sampai: string): Promise<BarisPenjualan[]> {
  const { mulai, akhir } = rentangWib(dari, sampai);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pembayaran")
    .select(
      "dibayar_at, pesanan!inner(kode_pesanan, tipe_pesanan, metode_pengiriman, status, subtotal, ongkir, total_harga, pelanggan:profiles!pesanan_id_user_fkey(nama, email), detail_pesanan(nama_item, jumlah))",
    )
    .eq("status_bayar", "lunas")
    .gte("dibayar_at", mulai)
    .lt("dibayar_at", akhir)
    .neq("pesanan.status", "dibatalkan")
    .order("dibayar_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`Gagal mengambil laporan: ${error.message}`);

  type Mentah = {
    dibayar_at: string;
    pesanan: {
      kode_pesanan: string;
      tipe_pesanan: TipePesanan;
      metode_pengiriman: MetodePengiriman;
      status: StatusPesanan;
      subtotal: number;
      ongkir: number;
      total_harga: number;
      pelanggan: { nama: string; email: string } | null;
      detail_pesanan: { nama_item: string; jumlah: number }[];
    };
  };

  // Satu pesanan dihitung sekali. Kalau QRIS sempat dibayar dua kali (kasus langka, admin dapat notifikasi
  // "Perlu ditinjau"), pendapatan tidak ikut terhitung ganda. Data sudah urut terbaru dulu, jadi pembayaran
  // paling awal per pesanan yang dipertahankan.
  const unik = new Map<string, Mentah>();
  for (const r of (data ?? []) as unknown as Mentah[]) unik.set(r.pesanan.kode_pesanan, r);
  return [...unik.values()].sort((a, b) => b.dibayar_at.localeCompare(a.dibayar_at)).map((r) => ({
    dibayar_at: r.dibayar_at,
    kode_pesanan: r.pesanan.kode_pesanan,
    nama_pelanggan: r.pesanan.pelanggan?.nama ?? "-",
    email_pelanggan: r.pesanan.pelanggan?.email ?? "",
    item: r.pesanan.detail_pesanan.map((d) => `${d.nama_item} x${d.jumlah}`).join(", "),
    tipe: r.pesanan.tipe_pesanan,
    metode: r.pesanan.metode_pengiriman,
    status: r.pesanan.status,
    subtotal: Number(r.pesanan.subtotal),
    ongkir: Number(r.pesanan.ongkir),
    total: Number(r.pesanan.total_harga),
  }));
}

/** Tanggal WIB "YYYY-MM-DD" untuk sebuah timestamp. */
export function tanggalWib(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

/** Periode bawaan: awal bulan ini sampai hari ini (WIB). */
export function periodeBawaan(): { dari: string; sampai: string } {
  const hariIni = tanggalWib(new Date());
  return { dari: hariIni.slice(0, 8) + "01", sampai: hariIni };
}

export function validTanggal(nilai: string | undefined): nilai is string {
  return typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(nilai) && !Number.isNaN(Date.parse(nilai));
}
