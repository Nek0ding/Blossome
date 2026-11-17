export type Peran = "customer" | "admin";
export type TipePesanan = "katalog" | "custom";
export type StatusPesanan =
  | "belum_dibayar"
  | "diproses"
  | "dikirim"
  | "siap_diambil"
  | "selesai"
  | "dibatalkan";
export type MetodePengiriman = "kirim" | "ambil";
export type StatusBayar = "menunggu" | "lunas" | "kedaluwarsa" | "gagal" | "dibatalkan";
export type TipeLogStok = "masuk" | "keluar" | "kembali" | "penyesuaian";
export type TipeNotifikasi = "pembayaran_berhasil" | "orderan_masuk" | "status";

export interface Profil {
  id: string;
  nama: string;
  email: string;
  no_telp: string | null;
  alamat: string | null;
  role: Peran;
  created_at: string;
}

export interface Kategori {
  id_kategori: number;
  nama_kategori: string;
  slug: string;
  deskripsi: string | null;
}

export interface Produk {
  id_produk: number;
  id_kategori: number;
  nama_produk: string;
  slug: string;
  deskripsi: string | null;
  komposisi: string | null;
  harga: number;
  stok: number;
  stok_minimum: number;
  gambar: string | null;
  is_aktif: boolean;
  is_best_seller: boolean;
  created_at: string;
  kategori?: Pick<Kategori, "nama_kategori" | "slug"> | null;
}

export interface Addon {
  id_addon: number;
  nama_addon: string;
  harga: number;
  stok: number;
  stok_minimum: number;
  gambar: string | null;
  is_aktif: boolean;
  is_kartu_ucapan: boolean;
}

export interface Zona {
  id_zona: number;
  nama_zona: string;
  tarif: number;
  is_aktif: boolean;
  urutan: number;
}

export const NAMA_HARI = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] as const;
export type NamaHari = (typeof NAMA_HARI)[number];

export interface JamHari {
  buka: string;
  tutup: string;
  libur: boolean;
}

export interface SlotKirim {
  mulai: string;
  selesai: string;
}

export interface TemplateEmail {
  subjek: string;
  isi: string;
}

export interface PengaturanToko {
  id: number;
  nama_toko: string;
  deskripsi: string | null;
  logo: string | null;
  email: string | null;
  no_whatsapp: string | null;
  alamat: string | null;
  kota: string | null;
  kode_pos: string | null;
  is_buka: boolean;
  jam_operasional: Record<NamaHari, JamHari>;
  jam_cutoff: string;
  slot_kirim: SlotKirim[];
  batas_bayar_menit: number;
  terima_preorder: boolean;
  template_email: {
    pembayaran_berhasil: TemplateEmail;
    orderan_masuk: TemplateEmail;
  };
}

export interface KeranjangAddon {
  id: number;
  id_addon: number;
  jumlah: number;
  addon: Pick<Addon, "nama_addon" | "harga" | "is_kartu_ucapan" | "stok" | "is_aktif"> | null;
}

export interface KeranjangItem {
  id_keranjang_item: number;
  id_produk: number;
  jumlah: number;
  produk: Pick<Produk, "nama_produk" | "slug" | "harga" | "gambar" | "stok" | "is_aktif"> | null;
  keranjang_addon: KeranjangAddon[];
}

export interface DetailAddon {
  id_detail_addon: number;
  id_addon: number | null;
  nama_addon: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
}

export interface DetailPesanan {
  id_detail: number;
  id_produk: number | null;
  nama_item: string;
  deskripsi_custom: string | null;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  ucapan_kartu: string | null;
  detail_addon: DetailAddon[];
}

export interface Pembayaran {
  id_pembayaran: number;
  id_pesanan: number;
  metode: string;
  nominal: number;
  gateway_order_id: string;
  gateway_transaction_id: string | null;
  qris_payload: string | null;
  qr_url: string | null;
  status_bayar: StatusBayar;
  kadaluarsa_at: string;
  dibayar_at: string | null;
  created_at: string;
}

export interface RiwayatStatus {
  id_riwayat: number;
  status: StatusPesanan;
  catatan: string | null;
  created_at: string;
}

export interface Pesanan {
  id_pesanan: number;
  kode_pesanan: string;
  id_user: string;
  tipe_pesanan: TipePesanan;
  nama_penerima: string;
  no_telp_penerima: string;
  metode_pengiriman: MetodePengiriman;
  id_zona: number | null;
  alamat_pengiriman: string | null;
  tanggal_kirim: string;
  slot_kirim: string;
  catatan: string | null;
  subtotal: number;
  ongkir: number;
  total_harga: number;
  status: StatusPesanan;
  batas_bayar_at: string;
  alasan_batal: string | null;
  created_at: string;
}

export interface PesananLengkap extends Pesanan {
  detail_pesanan: DetailPesanan[];
  pembayaran: Pembayaran[];
  riwayat_status: RiwayatStatus[];
  zona_pengiriman: Pick<Zona, "nama_zona"> | null;
  pelanggan?: Pick<Profil, "nama" | "email" | "no_telp"> | null;
}

export interface Notifikasi {
  id_notifikasi: number;
  id_pesanan: number | null;
  tipe: TipeNotifikasi;
  judul: string;
  pesan: string;
  is_dibaca: boolean;
  created_at: string;
  pesanan?: Pick<Pesanan, "kode_pesanan"> | null;
}

export interface LogStok {
  id_log: number;
  tipe: TipeLogStok;
  jumlah: number;
  stok_sebelum: number;
  stok_sesudah: number;
  keterangan: string | null;
  created_at: string;
  produk: Pick<Produk, "nama_produk"> | null;
  addon: Pick<Addon, "nama_addon"> | null;
}

/** State yang dikembalikan server action ke form. */
export type FormState = { error?: string; ok?: string } | null;
