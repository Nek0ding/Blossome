import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { FormPesananCustom, type PelangganPilihan } from "@/components/admin/form-pesanan-custom";
import { createClient } from "@/lib/supabase/server";
import { getAddonAktif, getZonaAktif } from "@/lib/data";
import { getPengaturan } from "@/lib/toko";
import { pilihanJadwal } from "@/lib/jadwal";

export const metadata: Metadata = { title: "Buat Pesanan Custom" };

export default async function HalamanPesananCustom() {
  const supabase = await createClient();
  const [{ data: pelanggan }, addons, zona, toko] = await Promise.all([
    supabase.from("profiles").select("id, nama, email, no_telp, alamat").eq("role", "customer").order("nama").limit(2000),
    getAddonAktif(),
    getZonaAktif(),
    getPengaturan(),
  ]);
  const jadwal = pilihanJadwal(toko, { untukAdmin: true, hari: 30 });

  return (
    <>
      <Link href="/admin/pesanan" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
        <ArrowLeft size={16} aria-hidden /> Semua pesanan
      </Link>
      <div className="mt-3">
        <JudulHalaman
          judul="Buat Pesanan Custom"
          deskripsi="Isi setelah desain dan harga disepakati dengan pelanggan lewat WhatsApp. Sistem akan membuat link pembayaran QRIS."
        />
      </div>
      <FormPesananCustom pelanggan={(pelanggan ?? []) as PelangganPilihan[]} addons={addons} zona={zona} jadwal={jadwal} />
    </>
  );
}
