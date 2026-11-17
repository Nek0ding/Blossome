import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { FormProduk } from "@/components/admin/form-produk";
import { getKategori } from "@/lib/data";

export const metadata: Metadata = { title: "Tambah Produk" };

export default async function TambahProduk() {
  const kategori = await getKategori();
  return (
    <>
      <Link href="/admin/produk" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
        <ArrowLeft size={16} aria-hidden /> Semua produk
      </Link>
      <div className="mt-3">
        <JudulHalaman judul="Tambah Produk" />
      </div>
      <FormProduk kategori={kategori} />
    </>
  );
}
