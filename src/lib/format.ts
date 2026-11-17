import type { MetodePengiriman, StatusBayar, StatusPesanan, TipeLogStok } from "./types";

const TZ = "Asia/Jakarta";

export function rupiah(nilai: number | null | undefined): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(nilai ?? 0)));
}

/** "2026-11-17" atau timestamp -> "17 Nov 2026" */
export function tanggal(nilai: string | Date): string {
  const d = typeof nilai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(nilai) ? new Date(nilai + "T00:00:00+07:00") : new Date(nilai);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(d);
}

/** "Senin, 17 November 2026" */
export function tanggalPanjang(nilai: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(nilai) ? new Date(nilai + "T00:00:00+07:00") : new Date(nilai);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

/** timestamp -> "17 Nov 2026, 10.24" */
export function tanggalJam(nilai: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(nilai));
}

/** "09:00-12:00" -> "09.00–12.00 WIB" */
export function labelSlot(slot: string): string {
  const [mulai, selesai] = slot.split("-");
  if (!mulai || !selesai) return slot;
  return `${mulai.replace(":", ".")}–${selesai.replace(":", ".")} WIB`;
}

export const STATUS_PESANAN: StatusPesanan[] = [
  "belum_dibayar",
  "diproses",
  "dikirim",
  "siap_diambil",
  "selesai",
  "dibatalkan",
];

const LABEL_STATUS: Record<StatusPesanan, string> = {
  belum_dibayar: "Belum Dibayar",
  diproses: "Diproses",
  dikirim: "Dikirim",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export function labelStatus(status: StatusPesanan): string {
  return LABEL_STATUS[status] ?? status;
}

const WARNA_STATUS: Record<StatusPesanan, string> = {
  belum_dibayar: "bg-amber-100 text-amber-800",
  diproses: "bg-sky-100 text-sky-800",
  dikirim: "bg-indigo-100 text-indigo-800",
  siap_diambil: "bg-indigo-100 text-indigo-800",
  selesai: "bg-emerald-100 text-emerald-800",
  dibatalkan: "bg-stone-200 text-stone-700",
};

export function warnaStatus(status: StatusPesanan): string {
  return WARNA_STATUS[status] ?? "bg-stone-100 text-stone-700";
}

const LABEL_BAYAR: Record<StatusBayar, string> = {
  menunggu: "Menunggu pembayaran",
  lunas: "Lunas",
  kedaluwarsa: "Kedaluwarsa",
  gagal: "Gagal",
  dibatalkan: "Dibatalkan",
};

export function labelBayar(status: StatusBayar): string {
  return LABEL_BAYAR[status] ?? status;
}

export function labelMetode(metode: MetodePengiriman): string {
  return metode === "kirim" ? "Dikirim ke alamat" : "Ambil di toko";
}

const LABEL_LOG: Record<TipeLogStok, string> = {
  masuk: "Masuk",
  keluar: "Keluar",
  kembali: "Kembali",
  penyesuaian: "Penyesuaian",
};

export function labelLogStok(tipe: TipeLogStok): string {
  return LABEL_LOG[tipe] ?? tipe;
}

/** Ubah teks menjadi slug URL: "Hand Bouquet" -> "hand-bouquet" */
export function buatSlug(teks: string): string {
  return teks
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Nomor WhatsApp untuk link wa.me: "0812..." -> "62812..." */
export function nomorWa(nomor: string | null | undefined): string {
  const angka = (nomor ?? "").replace(/\D/g, "");
  if (angka.startsWith("0")) return "62" + angka.slice(1);
  return angka;
}

export function linkWa(nomor: string | null | undefined, pesan: string): string {
  return `https://wa.me/${nomorWa(nomor)}?text=${encodeURIComponent(pesan)}`;
}
