import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { GambarProduk } from "@/components/gambar-produk";
import { FormTambahKeranjang } from "@/components/toko/form-tambah-keranjang";
import { getAddonAktif, getProdukBySlug } from "@/lib/data";
import { getSesi } from "@/lib/auth";
import { getPengaturan } from "@/lib/toko";
import { linkWa, rupiah } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const produk = await getProdukBySlug(slug);
  return { title: produk?.nama_produk ?? "Produk tidak ditemukan" };
}

export default async function HalamanProduk({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [produk, addons, sesi, toko] = await Promise.all([getProdukBySlug(slug), getAddonAktif(), getSesi(), getPengaturan()]);
  if (!produk) notFound();

  const wa = linkWa(
    toko.no_whatsapp,
    `Halo ${toko.nama_toko}, saya tertarik dengan ${produk.nama_produk} dan mau tanya atau request custom.`,
  );

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-abu">
          <Link href="/katalog" className="inline-flex items-center gap-1.5 font-medium text-zaitun-tua hover:underline">
            <ArrowLeft size={16} aria-hidden /> Our Catalog
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="truncate text-tinta">
            {produk.nama_produk}
          </span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="h-fit rounded-3xl bg-pink-muda p-4 lg:sticky lg:top-28">
            <GambarProduk
              src={produk.gambar}
              alt={produk.nama_produk}
              className="aspect-4/5 w-full rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 50vw"
              prioritas
            />
          </div>

          <div>
            {produk.kategori ? (
              <Link
                href={`/katalog?kategori=${produk.kategori.slug}`}
                className="text-sm font-semibold uppercase tracking-widest text-zaitun-tua hover:underline"
              >
                {produk.kategori.nama_kategori}
              </Link>
            ) : null}
            <h1 className="judul mt-2 text-5xl">{produk.nama_produk}</h1>
            <p className="mt-3 text-2xl font-bold text-zaitun-tua">{rupiah(produk.harga)}</p>

            <dl className="mt-6 space-y-4 rounded-2xl border border-garis bg-white p-5 text-sm">
              {produk.komposisi ? (
                <div>
                  <dt className="font-semibold text-tinta">Komposisi</dt>
                  <dd className="mt-1 text-abu">{produk.komposisi}</dd>
                </div>
              ) : null}
              {produk.deskripsi ? (
                <div>
                  <dt className="font-semibold text-tinta">Deskripsi</dt>
                  <dd className="mt-1 whitespace-pre-line text-abu">{produk.deskripsi}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-6">
              <FormTambahKeranjang
                idProduk={produk.id_produk}
                slug={produk.slug}
                harga={produk.harga}
                stok={produk.stok}
                addons={addons}
                sudahLogin={Boolean(sesi)}
              />
            </div>

            <div className="mt-6 rounded-2xl bg-sage-muda p-5">
              <p className="font-semibold text-tinta">Mau ganti kertas atau bunga?</p>
              <p className="mt-1 text-sm text-abu">
                Request desain di luar katalog lewat WhatsApp. Admin akan membuatkan pesanan custom untukmu.
              </p>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rose hover:underline"
              >
                <MessageCircle size={16} aria-hidden /> Chat admin untuk custom
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
