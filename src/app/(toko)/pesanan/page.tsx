import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Kosong, LencanaStatus, kelasTombol } from "@/components/ui";
import { wajibLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { labelMetode, rupiah, tanggal, tanggalJam } from "@/lib/format";
import type { Pesanan } from "@/lib/types";

export const metadata: Metadata = { title: "Pesanan Saya" };

type Baris = Pesanan & { detail_pesanan: { nama_item: string; jumlah: number }[] };

export default async function HalamanPesananSaya() {
  const sesi = await wajibLogin("/pesanan");
  const supabase = await createClient();
  const { data } = await supabase
    .from("pesanan")
    .select("*, detail_pesanan(nama_item, jumlah)")
    .eq("id_user", sesi.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const daftar = (data ?? []) as unknown as Baris[];

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="judul text-5xl">Pesanan Saya</h1>
        {daftar.length === 0 ? (
          <div className="mt-8">
            <Kosong judul="Belum ada pesanan">
              <p>Pesanan yang kamu buat akan muncul di sini.</p>
              <Link href="/katalog" className={kelasTombol("utama") + " mt-5"}>
                Mulai Belanja
              </Link>
            </Kosong>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {daftar.map((p) => {
              const ringkas = p.detail_pesanan.map((d) => `${d.nama_item} × ${d.jumlah}`).join(", ");
              return (
                <li key={p.id_pesanan}>
                  <Link
                    href={p.status === "belum_dibayar" ? `/pesanan/${p.kode_pesanan}/bayar` : `/pesanan/${p.kode_pesanan}`}
                    className="flex items-center gap-4 rounded-2xl border border-garis bg-white p-4 transition hover:border-zaitun sm:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.kode_pesanan}</span>
                        <LencanaStatus status={p.status} />
                        {p.tipe_pesanan === "custom" ? (
                          <span className="rounded-full bg-pink-muda px-2.5 py-1 text-xs font-semibold text-rose">Custom</span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-abu">{ringkas}</p>
                      <p className="mt-1 text-xs text-abu">
                        Dipesan {tanggalJam(p.created_at)} · {labelMetode(p.metode_pengiriman)} {tanggal(p.tanggal_kirim)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zaitun-tua">{rupiah(p.total_harga)}</p>
                      {p.status === "belum_dibayar" ? <p className="text-xs font-semibold text-rose">Bayar sekarang</p> : null}
                    </div>
                    <ChevronRight className="shrink-0 text-abu" size={18} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
