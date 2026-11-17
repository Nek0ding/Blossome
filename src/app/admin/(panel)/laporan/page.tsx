import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { JudulHalaman, KartuStat, Tabel, Td, Th } from "@/components/admin/ui-admin";
import { Kolom, Kosong, kelasInput, kelasTombol } from "@/components/ui";
import { getPenjualan, periodeBawaan, validTanggal } from "@/lib/laporan";
import { labelMetode, labelStatus, rupiah, tanggal, tanggalJam } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan" };

export default async function HalamanLaporan({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string }> }) {
  const sp = await searchParams;
  const bawaan = periodeBawaan();
  let dari = validTanggal(sp.dari) ? sp.dari : bawaan.dari;
  let sampai = validTanggal(sp.sampai) ? sp.sampai : bawaan.sampai;
  if (dari > sampai) [dari, sampai] = [sampai, dari];

  const baris = await getPenjualan(dari, sampai);
  const pendapatan = baris.reduce((n, b) => n + b.total, 0);
  const ongkir = baris.reduce((n, b) => n + b.ongkir, 0);
  const pelangganUnik = new Set(baris.map((b) => b.email_pelanggan || b.nama_pelanggan)).size;
  const qs = `dari=${dari}&sampai=${sampai}`;

  return (
    <>
      <JudulHalaman
        judul="Laporan Penjualan"
        deskripsi="Penjualan masuk = pesanan yang sudah dibayar lunas lewat QRIS dan tidak dibatalkan, berdasarkan tanggal bayar (WIB)."
        aksi={
          <>
            <a href={`/admin/laporan/unduh?${qs}&format=xlsx`} className={kelasTombol("utama", true)}>
              <Download size={16} aria-hidden /> Excel
            </a>
            <a href={`/admin/laporan/unduh?${qs}&format=csv`} className={kelasTombol("garis", true)}>
              <Download size={16} aria-hidden /> CSV
            </a>
          </>
        }
      />

      <form className="mb-6 grid gap-3 rounded-2xl border border-garis bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Kolom label="Dari tanggal" htmlFor="dari">
          <input id="dari" name="dari" type="date" defaultValue={dari} className={kelasInput} />
        </Kolom>
        <Kolom label="Sampai tanggal" htmlFor="sampai">
          <input id="sampai" name="sampai" type="date" defaultValue={sampai} className={kelasInput} />
        </Kolom>
        <button type="submit" className={kelasTombol("garis")}>
          Tampilkan
        </button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuStat label="Pendapatan" nilai={rupiah(pendapatan)} keterangan={`${tanggal(dari)} – ${tanggal(sampai)}`} warna="bg-amber-50" />
        <KartuStat label="Penjualan masuk" nilai={baris.length} keterangan="Pesanan lunas" />
        <KartuStat label="Pelanggan" nilai={pelangganUnik} keterangan="Pelanggan berbeda" warna="bg-pink-muda" />
        <KartuStat label="Ongkir" nilai={rupiah(ongkir)} keterangan="Sudah termasuk di pendapatan" warna="bg-sky-50" />
      </div>

      {baris.length === 0 ? (
        <Kosong judul="Belum ada penjualan">Tidak ada pembayaran lunas di periode ini.</Kosong>
      ) : (
        <Tabel>
          <thead>
            <tr>
              <Th>Tanggal bayar</Th>
              <Th>Kode</Th>
              <Th>Pelanggan</Th>
              <Th>Item</Th>
              <Th>Metode</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.kode_pesanan} className="hover:bg-krem">
                <Td className="whitespace-nowrap text-xs text-abu">{tanggalJam(b.dibayar_at)}</Td>
                <Td>
                  <Link href={`/admin/pesanan/${b.kode_pesanan}`} className="font-semibold text-rose hover:underline">
                    {b.kode_pesanan}
                  </Link>
                </Td>
                <Td>
                  <p className="font-medium">{b.nama_pelanggan}</p>
                  <p className="text-xs text-abu">{b.email_pelanggan}</p>
                </Td>
                <Td className="max-w-64 text-abu">{b.item}</Td>
                <Td className="whitespace-nowrap">{labelMetode(b.metode)}</Td>
                <Td className="whitespace-nowrap">{labelStatus(b.status)}</Td>
                <Td className="whitespace-nowrap text-right font-semibold">{rupiah(b.total)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <Td className="font-semibold" >Total</Td>
              <Td />
              <Td />
              <Td />
              <Td />
              <Td />
              <Td className="text-right font-bold">{rupiah(pendapatan)}</Td>
            </tr>
          </tfoot>
        </Tabel>
      )}
    </>
  );
}
