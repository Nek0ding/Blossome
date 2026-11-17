import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { Kartu } from "@/components/ui";
import { DaftarItem } from "@/components/pesanan/ringkasan";
import { PesananRealtime } from "@/components/pesanan/pesanan-realtime";
import { HitungMundur } from "@/components/pesanan/hitung-mundur";
import { FormBatalkan, FormBuatQr, FormCekStatus, TombolSalin } from "@/components/pesanan/aksi-customer";
import { wajibLogin } from "@/lib/auth";
import { getPesananByKode } from "@/lib/data";
import { midtransProduksi } from "@/lib/midtrans";
import { rupiah, tanggalJam } from "@/lib/format";
import type { PesananLengkap } from "@/lib/types";

export const metadata: Metadata = { title: "Pembayaran QRIS" };

const SIMULATOR_QRIS = "https://simulator.sandbox.midtrans.com/v2/qris/index";

/** Cek batas bayar dan QRIS yang masih berlaku, dihitung saat request. */
function statusPembayaran(pesanan: PesananLengkap) {
  const sekarang = Date.now();
  return {
    batasHabis: new Date(pesanan.batas_bayar_at).getTime() <= sekarang,
    aktif: pesanan.pembayaran.find(
      (p) => p.status_bayar === "menunggu" && p.qris_payload && new Date(p.kadaluarsa_at).getTime() > sekarang,
    ),
  };
}

export default async function HalamanBayar({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const sesi = await wajibLogin(`/pesanan/${kode}/bayar`);
  const pesanan = await getPesananByKode(kode);
  if (!pesanan || pesanan.id_user !== sesi.id) notFound();
  if (pesanan.status !== "belum_dibayar") redirect(`/pesanan/${pesanan.kode_pesanan}`);

  const { batasHabis, aktif } = statusPembayaran(pesanan);
  const gambarQr = aktif?.qris_payload
    ? await QRCode.toDataURL(aktif.qris_payload, { margin: 1, width: 320, errorCorrectionLevel: "M" })
    : null;
  const sandbox = !midtransProduksi();

  return (
    <div className="px-4 py-10 sm:px-6">
      <PesananRealtime idPesanan={pesanan.id_pesanan} />
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/pesanan/${pesanan.kode_pesanan}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline"
        >
          <ArrowLeft size={16} aria-hidden /> Detail pesanan
        </Link>
        <h1 className="judul mt-4 text-5xl">Pembayaran QRIS</h1>
        <p className="mt-1 text-sm text-abu">
          Pesanan {pesanan.kode_pesanan} · batas akhir {tanggalJam(pesanan.batas_bayar_at)}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <Kartu className="text-center">
            <p className="text-sm text-abu">Total pembayaran</p>
            <p className="mt-1 text-4xl font-bold text-zaitun-tua">{rupiah(pesanan.total_harga)}</p>

            {batasHabis ? (
              <p className="mx-auto mt-6 max-w-md rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
                Batas waktu pembayaran sudah habis. Pesanan akan dibatalkan otomatis dan stok dikembalikan.
              </p>
            ) : aktif && gambarQr ? (
              <>
                <div className="mx-auto mt-6 w-fit rounded-2xl border border-garis bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- QR berupa data URL */}
                  <img src={gambarQr} alt={`QRIS untuk pesanan ${pesanan.kode_pesanan}`} width={280} height={280} className="h-70 w-70" />
                </div>
                <p className="mt-4 text-sm text-abu">
                  QR berlaku <HitungMundur sampai={aktif.kadaluarsa_at} />
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-abu">
                  Scan dengan GoPay, OVO, DANA, ShopeePay, atau aplikasi mobile banking. Halaman ini otomatis berubah setelah
                  pembayaran diterima.
                </p>

                {sandbox && aktif.qr_url ? (
                  <div className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-zaitun-muda bg-sage-muda p-4 text-left text-sm">
                    <p className="font-semibold text-zaitun-tua">Mode sandbox (demo)</p>
                    <p className="mt-1 text-abu">
                      Jangan bayar QR ini dengan uang asli. Untuk simulasi, salin URL gambar QR lalu tempel di simulator QRIS
                      Midtrans.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <TombolSalin teks={aktif.qr_url} label="Salin URL QR" />
                      <a
                        href={SIMULATOR_QRIS}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-zaitun-tua hover:bg-white/70"
                      >
                        <ExternalLink size={14} aria-hidden /> Buka simulator QRIS
                      </a>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mx-auto mt-6 max-w-sm space-y-3">
                <p className="text-sm text-abu">
                  {pesanan.pembayaran.length > 0
                    ? "QRIS sebelumnya sudah tidak berlaku. Buat QRIS baru untuk melanjutkan pembayaran."
                    : "Tekan tombol di bawah untuk menampilkan QRIS pesanan ini."}
                </p>
                <FormBuatQr kode={pesanan.kode_pesanan} label={pesanan.pembayaran.length > 0 ? "Buat QRIS Baru" : "Tampilkan QRIS"} />
              </div>
            )}

            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-abu">
              <ShieldCheck size={14} aria-hidden /> Pembayaran diproses oleh Midtrans
            </p>
          </Kartu>

          <div className="space-y-4">
            <Kartu>
              <h2 className="mb-4 font-serif text-2xl font-bold italic">Ringkasan</h2>
              <DaftarItem pesanan={pesanan} />
            </Kartu>
            {aktif && !batasHabis ? <FormCekStatus kode={pesanan.kode_pesanan} /> : null}
            {!batasHabis ? <FormBatalkan kode={pesanan.kode_pesanan} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
