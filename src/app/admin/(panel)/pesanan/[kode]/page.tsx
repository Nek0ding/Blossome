import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { AksiStatusPesanan } from "@/components/admin/aksi-pesanan";
import { DaftarItem, InfoPengiriman, ProgresStatus, TimelineStatus } from "@/components/pesanan/ringkasan";
import { PesananRealtime } from "@/components/pesanan/pesanan-realtime";
import { TombolSalin } from "@/components/pesanan/aksi-customer";
import { Kartu, LencanaStatus, Pesan } from "@/components/ui";
import { getPesananByKode } from "@/lib/data";
import { getOrigin, getPengaturan } from "@/lib/toko";
import { labelBayar, linkWa, rupiah, tanggalJam } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ kode: string }> }): Promise<Metadata> {
  const { kode } = await params;
  return { title: `Pesanan ${kode}` };
}

export default async function DetailPesananAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string }>;
}) {
  const [{ kode }, { baru }] = await Promise.all([params, searchParams]);
  const [pesanan, toko, origin] = await Promise.all([getPesananByKode(kode, true), getPengaturan(), getOrigin()]);
  if (!pesanan) notFound();

  const linkBayar = `${origin}/pesanan/${pesanan.kode_pesanan}/bayar`;
  const pesanWa = `Halo ${pesanan.pelanggan?.nama ?? ""}, pesanan custom kamu ${pesanan.kode_pesanan} sebesar ${rupiah(pesanan.total_harga)} sudah kami buat. Silakan login lalu bayar dengan QRIS di sini: ${linkBayar}`;
  const nomorPelanggan = pesanan.pelanggan?.no_telp || pesanan.no_telp_penerima;

  return (
    <>
      <PesananRealtime idPesanan={pesanan.id_pesanan} />
      <Link href="/admin/pesanan" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
        <ArrowLeft size={16} aria-hidden /> Semua pesanan
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl font-bold">{pesanan.kode_pesanan}</h1>
        <LencanaStatus status={pesanan.status} />
        {pesanan.tipe_pesanan === "custom" ? (
          <span className="rounded-full bg-pink-muda px-2.5 py-1 text-xs font-semibold text-rose">Custom</span>
        ) : null}
        <span className="text-sm text-abu">Dibuat {tanggalJam(pesanan.created_at)}</span>
      </div>

      {baru ? (
        <div className="mb-6">
          <Pesan ok="Pesanan custom dibuat. Kirim link pembayaran di bawah ke pelanggan." />
        </div>
      ) : null}

      <div className="mb-6">
        <ProgresStatus pesanan={pesanan} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl font-bold">Item Pesanan</h2>
            <DaftarItem pesanan={pesanan} />
          </Kartu>
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl font-bold">Pengiriman</h2>
            <InfoPengiriman pesanan={pesanan} alamatToko={[toko.alamat, toko.kota].filter(Boolean).join(", ")} />
          </Kartu>
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl font-bold">Pembayaran</h2>
            {pesanan.pembayaran.length === 0 ? (
              <p className="text-sm text-abu">Belum ada QRIS yang dibuat untuk pesanan ini.</p>
            ) : (
              <ul className="divide-y divide-garis text-sm">
                {pesanan.pembayaran.map((b) => (
                  <li key={b.id_pembayaran} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-mono text-xs">{b.gateway_order_id}</span>
                    <span>{rupiah(b.nominal)}</span>
                    <span className="font-semibold">{labelBayar(b.status_bayar)}</span>
                    <span className="text-xs text-abu">
                      {b.dibayar_at ? `Dibayar ${tanggalJam(b.dibayar_at)}` : `Berlaku s.d. ${tanggalJam(b.kadaluarsa_at)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>

        <div className="space-y-6">
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl font-bold">Aksi</h2>
            <AksiStatusPesanan idPesanan={pesanan.id_pesanan} status={pesanan.status} metode={pesanan.metode_pengiriman} />
          </Kartu>

          {pesanan.status === "belum_dibayar" ? (
            <Kartu className="space-y-3">
              <h2 className="font-serif text-2xl font-bold">Link Pembayaran</h2>
              <p className="text-sm text-abu">
                Batas bayar {tanggalJam(pesanan.batas_bayar_at)}. Pelanggan harus login dengan akun yang sama untuk membuka link ini.
              </p>
              <p className="break-all rounded-xl bg-krem-tua px-3 py-2 font-mono text-xs">{linkBayar}</p>
              <div className="flex flex-wrap gap-2">
                <TombolSalin teks={linkBayar} label="Salin link" />
                {nomorPelanggan ? (
                  <a
                    href={linkWa(nomorPelanggan, pesanWa)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-zaitun-tua hover:bg-sage-muda"
                  >
                    <MessageCircle size={14} aria-hidden /> Kirim via WhatsApp
                  </a>
                ) : null}
              </div>
            </Kartu>
          ) : null}

          <Kartu className="space-y-1 text-sm">
            <h2 className="mb-3 font-serif text-2xl font-bold">Pelanggan</h2>
            <p className="font-semibold">{pesanan.pelanggan?.nama ?? "-"}</p>
            <p className="text-abu">{pesanan.pelanggan?.email}</p>
            {pesanan.pelanggan?.no_telp ? <p className="text-abu">{pesanan.pelanggan.no_telp}</p> : null}
            <Link href={`/admin/pelanggan/${pesanan.id_user}`} className="inline-block pt-2 font-semibold text-rose hover:underline">
              Lihat riwayat pelanggan
            </Link>
          </Kartu>

          <Kartu>
            <h2 className="mb-4 font-serif text-2xl font-bold">Riwayat Status</h2>
            <TimelineStatus pesanan={pesanan} />
          </Kartu>
        </div>
      </div>
    </>
  );
}
