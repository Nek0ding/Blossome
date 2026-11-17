import type { Metadata } from "next";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { FormKategori } from "@/components/admin/form-master";
import { Kartu } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getKategori } from "@/lib/data";

export const metadata: Metadata = { title: "Kategori" };

export default async function HalamanKategori() {
  const supabase = await createClient();
  const [kategori, { data: produk }] = await Promise.all([getKategori(), supabase.from("produk").select("id_kategori")]);
  const jumlah = new Map<number, number>();
  for (const p of produk ?? []) jumlah.set(p.id_kategori, (jumlah.get(p.id_kategori) ?? 0) + 1);

  return (
    <>
      <JudulHalaman judul="Kategori" deskripsi="Kategori tampil sebagai filter di halaman katalog." />
      <Kartu className="mb-6">
        <h2 className="mb-4 font-serif text-2xl font-bold">Tambah Kategori</h2>
        <FormKategori />
      </Kartu>
      <div className="space-y-4">
        {kategori.map((k) => (
          <Kartu key={k.id_kategori}>
            <FormKategori kategori={k} jumlahProduk={jumlah.get(k.id_kategori) ?? 0} />
          </Kartu>
        ))}
      </div>
    </>
  );
}
