import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Kartu, LencanaStatus, kelasTombol } from "@/components/ui";
import { DaftarItem, InfoPengiriman, ProgresStatus, TimelineStatus } from "@/components/pesanan/ringkasan";
import { PesananRealtime } from "@/components/pesanan/pesanan-realtime";
import { FormBatalkan } from "@/components/pesanan/aksi-customer";
import { wajibLogin } from "@/lib/auth";
import { getPesananByKode } from "@/lib/data";
import { getPengaturan } from "@/lib/toko";
import { labelBayar, linkWa, rupiah, tanggalJam } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ kode: string }> }): Promise<Metadata> {
  const { kode } = await params;
  return { title: `Pesanan ${kode}` };
}

export default async function HalamanDetailPesanan({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const sesi = await wajibLogin(`/pesanan/${kode}`);
  const [pesanan, toko] = await Promise.all([getPesananByKode(kode), getPengaturan()]);
  if (!pesanan || pesanan.id_user !== sesi.id) notFound();

  const lunas = pesanan.pembayaran.find((p) => p.status_bayar === "lunas");
  const alamatToko = [toko.alamat, toko.kota].filter(Boolean).join(", ");

  return (
    <div className="px-4 py-10 sm:px-6">
      <PesananRealtime idPesanan={pesanan.id_pesanan} />
      <div className="mx-auto max-w-5xl">
        <Link href="/pesanan" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
          <ArrowLeft size={16} aria-hidden /> Pesanan Saya
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="judul text-4xl sm:text-5xl">{pesanan.kode_pesanan}</h1>
          <LencanaStatus status={pesanan.status} />
        </div>
        <p className="mt-1 text-sm text-abu">Dipesan {tanggalJam(pesanan.created_at)}</p>

        <div className="mt-6">
          <ProgresStatus pesanan={pesanan} />
        </div>

        {pesanan.status === "belum_dibayar" ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Menunggu pembayaran {rupiah(pesanan.total_harga)}</p>
              <p className="text-sm text-amber-900/80">Bayar dengan QRIS sebelum {tanggalJam(pesanan.batas_bayar_at)}.</p>
            </div>
            <Link href={`/pesanan/${pesanan.kode_pesanan}/bayar`} className={kelasTombol("utama")}>
              Bayar Sekarang
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Kartu>
              <h2 className="mb-4 font-serif text-2xl font-bold italic">Item Pesanan</h2>
              <DaftarItem pesanan={pesanan} />
            </Kartu>
            <Kartu>
              <h2 className="mb-4 font-serif text-2xl font-bold italic">Pengiriman</h2>
              <InfoPengiriman pesanan={pesanan} alamatToko={alamatToko} />
            </Kartu>
          </div>

          <div className="space-y-6">
            <Kartu>
              <h2 className="mb-4 font-serif text-2xl font-bold italic">Riwayat Status</h2>
              <TimelineStatus pesanan={pesanan} />
            </Kartu>
            <Kartu className="space-y-3 text-sm">
              <h2 className="font-serif text-2xl font-bold italic">Pembayaran</h2>
              {lunas ? (
                <p>
                  QRIS · {labelBayar(lunas.status_bayar)}
                  {lunas.dibayar_at ? <span className="block text-xs text-abu">{tanggalJam(lunas.dibayar_at)}</span> : null}
                </p>
              ) : (
                <p className="text-abu">{pesanan.status === "dibatalkan" ? "Tidak ada pembayaran." : "Belum dibayar."}</p>
              )}
            </Kartu>
            {pesanan.status === "belum_dibayar" ? <FormBatalkan kode={pesanan.kode_pesanan} /> : null}
            <a
              href={linkWa(toko.no_whatsapp, `Halo ${toko.nama_toko}, saya mau tanya soal pesanan ${pesanan.kode_pesanan}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={kelasTombol("garis") + " w-full"}
            >
              <MessageCircle size={16} aria-hidden /> Tanya Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
