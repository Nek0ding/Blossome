import type { Metadata } from "next";
import Link from "next/link";
import { GambarProduk } from "@/components/gambar-produk";
import { JudulHalaman, Tabel, Td, Th } from "@/components/admin/ui-admin";
import { Kosong, Lencana, Pesan, kelasInput, kelasTombol } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getKategori } from "@/lib/data";
import { rupiah } from "@/lib/format";
import type { Produk } from "@/lib/types";

export const metadata: Metadata = { title: "Produk" };

const PESAN: Record<string, string> = {
  disimpan: "Produk tersimpan.",
  dihapus: "Produk dihapus.",
};

export default async function DaftarProdukAdmin({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; q?: string; pesan?: string }>;
}) {
  const sp = await searchParams;
  const kategori = await getKategori();
  const idKategori = Number(sp.kategori) || undefined;
  const q = (sp.q ?? "").replace(/[^\w\s'-]/g, "").trim().slice(0, 50);

  const supabase = await createClient();
  let query = supabase
    .from("produk")
    .select("id_produk, id_kategori, nama_produk, slug, harga, stok, stok_minimum, gambar, is_aktif, is_best_seller, created_at, kategori(nama_kategori, slug)")
    .order("is_aktif", { ascending: false })
    .order("nama_produk");
  if (idKategori) query = query.eq("id_kategori", idKategori);
  if (q) query = query.ilike("nama_produk", `%${q}%`);
  const { data } = await query;
  const produk = (data ?? []) as unknown as Produk[];

  return (
    <>
      <JudulHalaman
        judul="Produk"
        deskripsi={`${produk.length} produk`}
        aksi={
          <Link href="/admin/produk/baru" className={kelasTombol("utama", true)}>
            Tambah Produk
          </Link>
        }
      />
      {sp.pesan && PESAN[sp.pesan] ? (
        <div className="mb-4">
          <Pesan ok={PESAN[sp.pesan]} />
        </div>
      ) : null}

      <form className="mb-4 grid gap-3 rounded-2xl border border-garis bg-white p-4 sm:grid-cols-[1fr_220px_auto]" role="search">
        <label htmlFor="q" className="sr-only">Cari produk</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari nama produk" className={kelasInput} />
        <label htmlFor="kategori" className="sr-only">Kategori</label>
        <select id="kategori" name="kategori" defaultValue={idKategori ?? ""} className={kelasInput}>
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.id_kategori} value={k.id_kategori}>
              {k.nama_kategori}
            </option>
          ))}
        </select>
        <button type="submit" className={kelasTombol("garis")}>
          Terapkan
        </button>
      </form>

      {produk.length === 0 ? (
        <Kosong judul="Belum ada produk">Tambahkan produk pertama untuk ditampilkan di katalog.</Kosong>
      ) : (
        <>
        {/* HP: kartu produk, tombol Ubah langsung terlihat */}
        <ul className="space-y-3 md:hidden">
          {produk.map((p) => (
            <li key={p.id_produk} className="flex items-center gap-3 rounded-2xl border border-garis bg-white p-3">
              <GambarProduk src={p.gambar} alt={p.nama_produk} className="h-16 w-14 shrink-0 rounded-lg" sizes="56px" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.nama_produk}</p>
                <p className="text-xs text-abu">
                  {p.kategori?.nama_kategori ?? "-"} · {rupiah(p.harga)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={p.stok <= p.stok_minimum ? "font-semibold text-amber-700" : "text-abu"}>Stok {p.stok}</span>
                  {p.is_aktif ? <Lencana>Aktif</Lencana> : <Lencana warna="bg-stone-200 text-stone-700">Nonaktif</Lencana>}
                  {p.is_best_seller ? <span className="font-semibold text-rose">Best Seller</span> : null}
                </p>
              </div>
              <Link href={`/admin/produk/${p.id_produk}`} className={kelasTombol("garis", true, "shrink-0")}>
                Ubah
              </Link>
            </li>
          ))}
        </ul>
        <Tabel className="hidden md:block">
          <thead>
            <tr>
              <Th>Produk</Th>
              <Th>Kategori</Th>
              <Th>Harga</Th>
              <Th>Stok</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {produk.map((p) => (
              <tr key={p.id_produk} className="hover:bg-krem">
                <Td>
                  <div className="flex items-center gap-3">
                    <GambarProduk src={p.gambar} alt={p.nama_produk} className="h-14 w-12 shrink-0 rounded-lg" sizes="48px" />
                    <div>
                      <p className="font-semibold">{p.nama_produk}</p>
                      {p.is_best_seller ? <p className="text-xs font-semibold text-rose">Best Seller</p> : null}
                    </div>
                  </div>
                </Td>
                <Td>{p.kategori?.nama_kategori ?? "-"}</Td>
                <Td>{rupiah(p.harga)}</Td>
                <Td>
                  <span className={p.stok <= p.stok_minimum ? "font-semibold text-amber-700" : ""}>{p.stok}</span>
                </Td>
                <Td>
                  {p.is_aktif ? <Lencana>Aktif</Lencana> : <Lencana warna="bg-stone-200 text-stone-700">Nonaktif</Lencana>}
                </Td>
                <Td className="text-right">
                  <Link href={`/admin/produk/${p.id_produk}`} className="font-semibold text-rose hover:underline">
                    Ubah
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
        </>
      )}
    </>
  );
}
