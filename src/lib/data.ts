import "server-only";

import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { createClient } from "./supabase/server";
import { createPublicClient } from "./supabase/public";
import type { Addon, Kategori, KeranjangItem, PesananLengkap, Produk, Zona } from "./types";

const KOLOM_PRODUK =
  "id_produk, id_kategori, nama_produk, slug, deskripsi, komposisi, harga, stok, stok_minimum, gambar, is_aktif, is_best_seller, created_at, kategori(nama_kategori, slug)";

const KOLOM_PEMBAYARAN =
  "id_pembayaran, id_pesanan, metode, nominal, gateway_order_id, gateway_transaction_id, qris_payload, qr_url, status_bayar, kadaluarsa_at, dibayar_at, created_at";

export const KOLOM_PESANAN_LENGKAP = `*, detail_pesanan(*, detail_addon(*)), pembayaran(${KOLOM_PEMBAYARAN}), riwayat_status(id_riwayat, status, catatan, created_at), zona_pengiriman(nama_zona)`;

/** Tag cache data katalog (kategori, produk, addon, zona). Dibersihkan setiap admin mengubah data atau stok berubah. */
export const TAG_KATALOG = "katalog";

/**
 * Data katalog publik di-cache di server (maks. 60 detik, atau sampai tag dibersihkan),
 * jadi halaman toko tidak selalu menunggu database. Stok tetap divalidasi ulang oleh database saat checkout.
 */
function cacheKatalog<A extends unknown[], R>(fn: (...args: A) => Promise<R>, kunci: string) {
  return unstable_cache(fn, ["blossome", kunci], { tags: [TAG_KATALOG], revalidate: 60 });
}

/** Error query tidak ikut di-cache: dilempar di dalam cache, lalu ditangkap di sini. */
async function aman<T>(label: string, fn: () => Promise<T>, cadangan: T): Promise<T> {
  await connection(); // render per request, bukan saat build
  try {
    return await fn();
  } catch (err) {
    console.error(`[data] ${label}:`, err instanceof Error ? err.message : err);
    return cadangan;
  }
}

const kategoriCache = cacheKatalog(async () => {
  const { data, error } = await createPublicClient()
    .from("kategori")
    .select("id_kategori, nama_kategori, slug, deskripsi")
    .order("id_kategori");
  if (error) throw new Error(error.message);
  return (data ?? []) as Kategori[];
}, "kategori");

export function getKategori(): Promise<Kategori[]> {
  return aman("kategori", () => kategoriCache(), []);
}

const produkCache = cacheKatalog(async (idKategori: number | null, bestSeller: boolean, limit: number | null) => {
  let query = createPublicClient().from("produk").select(KOLOM_PRODUK).eq("is_aktif", true);
  if (idKategori) query = query.eq("id_kategori", idKategori);
  if (bestSeller) query = query.eq("is_best_seller", true);
  query = query.order("created_at", { ascending: false }).order("id_produk", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Produk[];
}, "produk-aktif");

export function getProdukAktif(opsi: { idKategori?: number; bestSeller?: boolean; limit?: number } = {}): Promise<Produk[]> {
  return aman("produk", () => produkCache(opsi.idKategori ?? null, opsi.bestSeller ?? false, opsi.limit ?? null), []);
}

const produkSlugCache = cacheKatalog(async (slug: string) => {
  const { data, error } = await createPublicClient()
    .from("produk")
    .select(KOLOM_PRODUK)
    .eq("slug", slug)
    .eq("is_aktif", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Produk | null) ?? null;
}, "produk-slug");

export function getProdukBySlug(slug: string): Promise<Produk | null> {
  if (!/^[a-z0-9-]{1,220}$/.test(slug)) return Promise.resolve(null);
  return aman("produk slug", () => produkSlugCache(slug), null);
}

const addonCache = cacheKatalog(async () => {
  const { data, error } = await createPublicClient()
    .from("addon")
    .select("id_addon, nama_addon, harga, stok, stok_minimum, gambar, is_aktif, is_kartu_ucapan")
    .eq("is_aktif", true)
    .order("id_addon");
  if (error) throw new Error(error.message);
  return (data ?? []) as Addon[];
}, "addon-aktif");

export function getAddonAktif(): Promise<Addon[]> {
  return aman("addon", () => addonCache(), []);
}

const zonaCache = cacheKatalog(async () => {
  const { data, error } = await createPublicClient()
    .from("zona_pengiriman")
    .select("id_zona, nama_zona, tarif, is_aktif, urutan")
    .eq("is_aktif", true)
    .order("urutan")
    .order("id_zona");
  if (error) throw new Error(error.message);
  return (data ?? []) as Zona[];
}, "zona-aktif");

export function getZonaAktif(): Promise<Zona[]> {
  return aman("zona", () => zonaCache(), []);
}

export async function getKeranjang(idUser: string): Promise<KeranjangItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("keranjang_item")
    .select(
      "id_keranjang_item, id_produk, jumlah, produk(nama_produk, slug, harga, gambar, stok, is_aktif), keranjang_addon(id, id_addon, jumlah, addon(nama_addon, harga, is_kartu_ucapan, stok, is_aktif))",
    )
    .eq("id_user", idUser)
    .order("id_keranjang_item");
  return (data ?? []) as unknown as KeranjangItem[];
}

export function subtotalKeranjang(item: KeranjangItem): number {
  const produk = (item.produk?.harga ?? 0) * item.jumlah;
  const addon = item.keranjang_addon.reduce((n, a) => n + (a.addon?.harga ?? 0) * a.jumlah, 0);
  return produk + addon;
}

export async function getJumlahKeranjang(idUser: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("keranjang_item")
    .select("id_keranjang_item", { count: "exact", head: true })
    .eq("id_user", idUser);
  return count ?? 0;
}

export async function getJumlahNotifBaru(idUser: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifikasi")
    .select("id_notifikasi", { count: "exact", head: true })
    .eq("id_user", idUser)
    .eq("channel", "web")
    .eq("is_dibaca", false);
  return count ?? 0;
}

/** Pesanan lengkap berdasarkan kode. RLS memastikan hanya pemilik atau admin yang bisa membacanya. */
export async function getPesananByKode(kode: string, denganPelanggan = false): Promise<PesananLengkap | null> {
  const supabase = await createClient();
  const kolom = denganPelanggan
    ? `${KOLOM_PESANAN_LENGKAP}, pelanggan:profiles!pesanan_id_user_fkey(nama, email, no_telp)`
    : KOLOM_PESANAN_LENGKAP;
  const { data } = await supabase.from("pesanan").select(kolom).eq("kode_pesanan", kode).maybeSingle();
  if (!data) return null;
  const pesanan = data as unknown as PesananLengkap;
  pesanan.detail_pesanan = [...(pesanan.detail_pesanan ?? [])].sort((a, b) => a.id_detail - b.id_detail);
  pesanan.pembayaran = [...(pesanan.pembayaran ?? [])].sort((a, b) => b.id_pembayaran - a.id_pembayaran);
  pesanan.riwayat_status = [...(pesanan.riwayat_status ?? [])].sort((a, b) => a.id_riwayat - b.id_riwayat);
  return pesanan;
}
