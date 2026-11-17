import type { Metadata } from "next";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { FormAddon } from "@/components/admin/form-master";
import { Kartu } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Addon } from "@/lib/types";

export const metadata: Metadata = { title: "Addon" };

export default async function HalamanAddon() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("addon")
    .select("id_addon, nama_addon, harga, stok, stok_minimum, gambar, is_aktif, is_kartu_ucapan")
    .order("is_aktif", { ascending: false })
    .order("id_addon");
  const addons = (data ?? []) as Addon[];

  return (
    <>
      <JudulHalaman judul="Addon" deskripsi="Tambahan yang bisa dipilih pelanggan di halaman produk, seperti kartu ucapan, boneka, dan coklat." />
      <Kartu className="mb-6">
        <h2 className="mb-4 font-serif text-2xl font-bold">Tambah Addon</h2>
        <FormAddon />
      </Kartu>
      <div className="grid gap-4 xl:grid-cols-2">
        {addons.map((a) => (
          <Kartu key={a.id_addon} className={a.is_aktif ? "" : "opacity-75"}>
            <FormAddon addon={a} />
          </Kartu>
        ))}
      </div>
    </>
  );
}
