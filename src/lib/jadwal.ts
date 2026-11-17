import { NAMA_HARI, type PengaturanToko } from "./types";
import { labelSlot } from "./format";

/**
 * Aturan jadwal di file ini harus sama dengan fungsi private.validasi_jadwal di database.
 * Database tetap jadi penentu akhir; file ini hanya untuk menampilkan pilihan yang valid di form.
 */

export interface PilihanTanggal {
  nilai: string; // YYYY-MM-DD
  label: string;
  hariIni: boolean;
  slot: { nilai: string; label: string }[];
}

function keMenit(jam: string): number {
  const [j, m] = jam.split(":").map(Number);
  return (j || 0) * 60 + (m || 0);
}

/** Tanggal dan jam sekarang di zona WIB. */
export function sekarangWib(now: Date = new Date()): { tanggal: string; menit: number } {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const ambil = (tipe: string) => bagian.find((b) => b.type === tipe)?.value ?? "00";
  return {
    tanggal: `${ambil("year")}-${ambil("month")}-${ambil("day")}`,
    menit: Number(ambil("hour")) * 60 + Number(ambil("minute")),
  };
}

function tambahHari(tanggal: string, hari: number): { nilai: string; indeksHari: number; label: string } {
  const [y, m, d] = tanggal.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + hari));
  const nilai = dt.toISOString().slice(0, 10);
  // getUTCDay: 0 = Minggu. NAMA_HARI: 0 = Senin.
  const indeksHari = (dt.getUTCDay() + 6) % 7;
  const label = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
  return { nilai, indeksHari, label };
}

/**
 * Daftar tanggal yang bisa dipilih beserta slotnya.
 * untukAdmin = true melewati aturan toko buka, cut-off, dan pre-order (dipakai di pesanan custom).
 */
export function pilihanJadwal(
  toko: PengaturanToko,
  opsi: { hari?: number; untukAdmin?: boolean; now?: Date } = {},
): PilihanTanggal[] {
  const { hari = 14, untukAdmin = false, now = new Date() } = opsi;
  const wib = sekarangWib(now);
  const hasil: PilihanTanggal[] = [];

  if (!untukAdmin && !toko.is_buka) return hasil;

  for (let i = 0; i <= hari; i++) {
    const t = tambahHari(wib.tanggal, i);
    const jam = toko.jam_operasional?.[NAMA_HARI[t.indeksHari]];
    if (!jam || jam.libur) continue;

    const hariIni = i === 0;
    if (!untukAdmin) {
      if (hariIni && wib.menit >= keMenit(toko.jam_cutoff)) continue;
      if (!hariIni && !toko.terima_preorder) continue;
    }

    const slot = (toko.slot_kirim ?? [])
      .filter((s) => keMenit(s.mulai) < keMenit(jam.tutup))
      .filter((s) => untukAdmin || !hariIni || keMenit(s.mulai) > wib.menit)
      .map((s) => {
        const nilai = `${s.mulai}-${s.selesai}`;
        return { nilai, label: labelSlot(nilai) };
      });
    if (slot.length === 0) continue;

    hasil.push({
      nilai: t.nilai,
      label: hariIni ? `Hari ini, ${t.label}` : t.label,
      hariIni,
      slot,
    });
  }
  return hasil;
}
