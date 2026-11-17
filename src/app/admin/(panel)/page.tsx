import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { GrafikPendapatan } from "@/components/admin/grafik-pendapatan";
import { JudulHalaman, KartuStat } from "@/components/admin/ui-admin";
import { Kartu, LencanaStatus, kelasTombol } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { periodeBawaan, rentangWib, tanggalWib } from "@/lib/laporan";
import { rupiah, tanggalJam } from "@/lib/format";
import type { Pesanan } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

function tujuhHariTerakhir(): string[] {
  const hasil: string[] = [];
  const hariIni = tanggalWib(new Date());
  const [y, m, d] = hariIni.split("-").map(Number);
  for (let i = 6; i >= 0; i--) {
    hasil.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }
  return hasil;
}

export default async function DashboardAdmin() {
  const supabase = await createClient();
  const hari = tujuhHariTerakhir();
  const bulanIni = periodeBawaan();
  const rentang7 = rentangWib(hari[0], hari[6]);
  const rentangBulan = rentangWib(bulanIni.dari, bulanIni.sampai);

  const [
    { count: totalPesanan },
    { count: belumBayar },
    { count: totalProduk },
    { data: bayar7 },
    { data: bayarBulan },
    { data: terbaru },
    { data: produk },
    { data: addon },
  ] = await Promise.all([
    supabase.from("pesanan").select("id_pesanan", { count: "exact", head: true }).neq("status", "dibatalkan"),
    supabase.from("pesanan").select("id_pesanan", { count: "exact", head: true }).eq("status", "belum_dibayar"),
    supabase.from("produk").select("id_produk", { count: "exact", head: true }).eq("is_aktif", true),
    supabase
      .from("pembayaran")
      .select("nominal, dibayar_at, pesanan!inner(status)")
      .eq("status_bayar", "lunas")
      .neq("pesanan.status", "dibatalkan")
      .gte("dibayar_at", rentang7.mulai)
      .lt("dibayar_at", rentang7.akhir),
    supabase
      .from("pembayaran")
      .select("nominal, pesanan!inner(status)")
      .eq("status_bayar", "lunas")
      .neq("pesanan.status", "dibatalkan")
      .gte("dibayar_at", rentangBulan.mulai)
      .lt("dibayar_at", rentangBulan.akhir),
    supabase
      .from("pesanan")
      .select("id_pesanan, kode_pesanan, nama_penerima, total_harga, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("produk").select("id_produk, nama_produk, stok, stok_minimum").eq("is_aktif", true),
    supabase.from("addon").select("id_addon, nama_addon, stok, stok_minimum").eq("is_aktif", true),
  ]);

  const perHari = new Map(hari.map((h) => [h, 0]));
  for (const b of bayar7 ?? []) {
    const t = tanggalWib(b.dibayar_at as string);
    perHari.set(t, (perHari.get(t) ?? 0) + Number(b.nominal));
  }
  const fmtHari = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });
  const dataGrafik = hari.map((h) => ({ label: fmtHari.format(new Date(h + "T00:00:00Z")), total: perHari.get(h) ?? 0 }));
  const total7 = dataGrafik.reduce((n, d) => n + d.total, 0);
  const pendapatanBulan = (bayarBulan ?? []).reduce((n, b) => n + Number(b.nominal), 0);

  const menipis = [
    ...(produk ?? []).filter((p) => p.stok <= p.stok_minimum).map((p) => ({ kunci: `p${p.id_produk}`, nama: p.nama_produk, stok: p.stok, min: p.stok_minimum, jenis: "Produk" })),
    ...(addon ?? []).filter((a) => a.stok <= a.stok_minimum).map((a) => ({ kunci: `a${a.id_addon}`, nama: a.nama_addon, stok: a.stok, min: a.stok_minimum, jenis: "Addon" })),
  ].sort((a, b) => a.stok - b.stok);

  return (
    <>
      <JudulHalaman judul="Dashboard" deskripsi="Ringkasan toko hari ini." aksi={<Link href="/admin/pesanan/baru" className={kelasTombol("utama", true)}>Buat Pesanan Custom</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuStat label="Total Pesanan" nilai={totalPesanan ?? 0} keterangan="Tidak termasuk yang dibatalkan" href="/admin/pesanan" />
        <KartuStat label="Menunggu Pembayaran" nilai={belumBayar ?? 0} keterangan="Status Belum Dibayar" href="/admin/pesanan?status=belum_dibayar" warna="bg-pink-muda" />
        <KartuStat label="Pendapatan Bulan Ini" nilai={rupiah(pendapatanBulan)} keterangan="Dari pembayaran QRIS lunas" href="/admin/laporan" warna="bg-amber-50" />
        <KartuStat label="Produk Aktif" nilai={totalProduk ?? 0} keterangan="Tampil di katalog" href="/admin/produk" warna="bg-sky-50" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Kartu>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl font-bold">Grafik Pendapatan</h2>
            <p className="text-sm text-abu">7 hari: <span className="font-semibold text-tinta">{rupiah(total7)}</span></p>
          </div>
          <GrafikPendapatan data={dataGrafik} />
        </Kartu>

        <Kartu>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold">Pesanan Terbaru</h2>
            <Link href="/admin/pesanan" className="text-sm font-semibold text-rose hover:underline">
              Lihat semua
            </Link>
          </div>
          {(terbaru ?? []).length === 0 ? (
            <p className="text-sm text-abu">Belum ada pesanan.</p>
          ) : (
            <ul className="divide-y divide-garis">
              {(terbaru as Pick<Pesanan, "id_pesanan" | "kode_pesanan" | "nama_penerima" | "total_harga" | "status" | "created_at">[]).map((p) => (
                <li key={p.id_pesanan}>
                  <Link href={`/admin/pesanan/${p.kode_pesanan}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {p.kode_pesanan} · {p.nama_penerima}
                      </p>
                      <p className="text-xs text-abu">
                        {rupiah(p.total_harga)} · {tanggalJam(p.created_at)}
                      </p>
                    </div>
                    <LencanaStatus status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      </div>

      <Kartu className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-2xl font-bold">
            <AlertTriangle size={20} className="text-amber-600" aria-hidden /> Stok Menipis
          </h2>
          <Link href="/admin/stok" className="text-sm font-semibold text-rose hover:underline">
            Kelola stok
          </Link>
        </div>
        {menipis.length === 0 ? (
          <p className="text-sm text-abu">Semua stok masih di atas batas minimum.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menipis.map((m) => (
              <li key={m.kunci} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{m.nama}</p>
                  <p className="text-xs text-abu">
                    {m.jenis} · stok tersisa {m.stok}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">min {m.min}</span>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </>
  );
}
