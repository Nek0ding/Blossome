import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { FormProduk } from "@/components/admin/form-produk";
import { createClient } from "@/lib/supabase/server";
import { getKategori } from "@/lib/data";
import type { Produk } from "@/lib/types";

export const metadata: Metadata = { title: "Ubah Produk" };

export default async function UbahProduk({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idProduk = Number(id);
  if (!Number.isInteger(idProduk)) notFound();

  const supabase = await createClient();
  const [{ data }, kategori] = await Promise.all([
    supabase.from("produk").select("*").eq("id_produk", idProduk).maybeSingle(),
    getKategori(),
  ]);
  if (!data) notFound();
  const produk = data as Produk;

  return (
    <>
      <Link href="/admin/produk" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
        <ArrowLeft size={16} aria-hidden /> Semua produk
      </Link>
      <div className="mt-3">
        <JudulHalaman
          judul={produk.nama_produk}
          aksi={
            produk.is_aktif ? (
              <Link href={`/produk/${produk.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose hover:underline">
                <ExternalLink size={16} aria-hidden /> Lihat di toko
              </Link>
            ) : null
          }
        />
      </div>
      <FormProduk produk={produk} kategori={kategori} />
    </>
  );
}
