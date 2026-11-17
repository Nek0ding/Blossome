import type { Metadata } from "next";
import Link from "next/link";
import { JudulHalaman, Paginasi, Tabel, Td, Th } from "@/components/admin/ui-admin";
import { Kosong, LencanaStatus, kelasInput, kelasTombol } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { STATUS_PESANAN, labelMetode, labelStatus, rupiah, tanggal, tanggalJam } from "@/lib/format";
import type { Pesanan, StatusPesanan } from "@/lib/types";

export const metadata: Metadata = { title: "Pesanan" };

const PER_HALAMAN = 30;

type Baris = Pesanan & { pelanggan: { nama: string; email: string } | null };

export default async function DaftarPesananAdmin({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipe?: string; q?: string; hal?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUS_PESANAN.includes(sp.status as StatusPesanan) ? (sp.status as StatusPesanan) : undefined;
  const tipe = sp.tipe === "katalog" || sp.tipe === "custom" ? sp.tipe : undefined;
  const q = (sp.q ?? "").replace(/[^\w\s@.-]/g, "").trim().slice(0, 50);
  const halaman = Math.min(10_000, Math.max(1, Number.parseInt(sp.hal ?? "1", 10) || 1));

  const supabase = await createClient();
  let query = supabase
    .from("pesanan")
    .select("*, pelanggan:profiles!pesanan_id_user_fkey(nama, email)")
    .order("created_at", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);
  if (status) query = query.eq("status", status);
  if (tipe) query = query.eq("tipe_pesanan", tipe);
  if (q) query = query.or(`kode_pesanan.ilike.%${q}%,nama_penerima.ilike.%${q}%`);
  const { data, error } = await query;
  const semua = (data ?? []) as unknown as Baris[];
  const daftar = semua.slice(0, PER_HALAMAN);

  const buatHref = (h: number) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (tipe) p.set("tipe", tipe);
    if (q) p.set("q", q);
    if (h > 1) p.set("hal", String(h));
    const s = p.toString();
    return `/admin/pesanan${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <JudulHalaman
        judul="Pesanan"
        deskripsi="Semua pesanan katalog dan custom."
        aksi={
          <Link href="/admin/pesanan/baru" className={kelasTombol("utama", true)}>
            Buat Pesanan Custom
          </Link>
        }
      />

      <form className="mb-4 grid gap-3 rounded-2xl border border-garis bg-white p-4 sm:grid-cols-[1fr_180px_160px_auto]" role="search">
        <label className="sr-only" htmlFor="q">Cari</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari kode pesanan atau nama penerima" className={kelasInput} />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status ?? ""} className={kelasInput}>
          <option value="">Semua status</option>
          {STATUS_PESANAN.map((s) => (
            <option key={s} value={s}>
              {labelStatus(s)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="tipe">Tipe</label>
        <select id="tipe" name="tipe" defaultValue={tipe ?? ""} className={kelasInput}>
          <option value="">Semua tipe</option>
          <option value="katalog">Katalog</option>
          <option value="custom">Custom</option>
        </select>
        <button type="submit" className={kelasTombol("garis")}>
          Terapkan
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-red-700">Gagal memuat pesanan: {error.message}</p> : null}

      {daftar.length === 0 ? (
        <Kosong judul="Tidak ada pesanan">Coba ubah filter atau kata kunci pencarian.</Kosong>
      ) : (
        <Tabel>
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Pelanggan / Penerima</Th>
              <Th>Jadwal</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Dibuat</Th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((p) => (
              <tr key={p.id_pesanan} className="hover:bg-krem">
                <Td>
                  <Link href={`/admin/pesanan/${p.kode_pesanan}`} className="font-semibold text-rose hover:underline">
                    {p.kode_pesanan}
                  </Link>
                  {p.tipe_pesanan === "custom" ? <span className="ml-2 rounded-full bg-pink-muda px-2 py-0.5 text-[11px] font-semibold text-rose">Custom</span> : null}
                </Td>
                <Td>
                  <p className="font-medium">{p.pelanggan?.nama ?? "-"}</p>
                  <p className="text-xs text-abu">Untuk {p.nama_penerima}</p>
                </Td>
                <Td>
                  <p>{tanggal(p.tanggal_kirim)}</p>
                  <p className="text-xs text-abu">
                    {p.slot_kirim} · {labelMetode(p.metode_pengiriman)}
                  </p>
                </Td>
                <Td className="font-semibold">{rupiah(p.total_harga)}</Td>
                <Td>
                  <LencanaStatus status={p.status} />
                </Td>
                <Td className="text-xs text-abu">{tanggalJam(p.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      )}
      <Paginasi halaman={halaman} adaBerikutnya={semua.length > PER_HALAMAN} buatHref={buatHref} />
    </>
  );
}
