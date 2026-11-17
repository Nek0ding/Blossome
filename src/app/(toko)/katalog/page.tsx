import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { KartuProduk } from "@/components/toko/kartu-produk";
import { Kosong } from "@/components/ui";
import { getKategori, getProdukAktif } from "@/lib/data";

export const metadata: Metadata = { title: "Our Catalog" };

export default async function HalamanKatalog({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori: slug } = await searchParams;
  const kategori = await getKategori();
  const aktif = kategori.find((k) => k.slug === slug) ?? null;
  const produk = await getProdukAktif({ idKategori: aktif?.id_kategori });

  return (
    <div className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-zaitun-tua">Ada bunga untuk setiap perasaan.</p>
          <h1 className="judul mt-2 text-6xl">Our Catalog</h1>
          <p className="mx-auto mt-3 max-w-2xl text-abu">
            Temukan rangkaian untuk merayakan, menyapa, atau sekadar membuat hari terasa lebih istimewa.
          </p>
        </div>

        <nav aria-label="Filter kategori" className="mt-8 flex flex-wrap justify-center gap-2">
          <Link
            href="/katalog"
            aria-current={!aktif ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200",
              !aktif ? "bg-zaitun text-white" : "border border-garis bg-white text-zaitun-tua hover:border-zaitun",
            )}
          >
            Semua
          </Link>
          {kategori.map((k) => {
            const dipilih = aktif?.id_kategori === k.id_kategori;
            return (
              <Link
                key={k.id_kategori}
                href={`/katalog?kategori=${k.slug}`}
                aria-current={dipilih ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200",
                  dipilih ? "bg-zaitun text-white" : "border border-garis bg-white text-zaitun-tua hover:border-zaitun",
                )}
              >
                {k.nama_kategori}
              </Link>
            );
          })}
        </nav>

        {aktif?.deskripsi ? (
          <p key={aktif.slug} className="teks-muncul mt-4 text-center text-sm text-abu">
            {aktif.deskripsi}
          </p>
        ) : null}

        <div className="mt-10">
          {produk.length === 0 ? (
            <Kosong judul="Belum ada produk">
              Produk untuk kategori ini sedang disiapkan. Untuk desain khusus, hubungi kami lewat WhatsApp.
            </Kosong>
          ) : (
            // key per kategori: grid dipasang ulang saat filter berganti, jadi animasinya diputar lagi
            <div key={aktif?.slug ?? "semua"} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {produk.map((p, i) => (
                <KartuProduk key={p.id_produk} produk={p} urutan={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
