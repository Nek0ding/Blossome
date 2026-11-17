import type { CSSProperties } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import { GambarProduk } from "@/components/gambar-produk";
import { rupiah } from "@/lib/format";
import type { Produk } from "@/lib/types";

/**
 * Kartu produk dengan animasi muncul.
 * - `urutan`: posisi kartu di grid, untuk efek muncul bergiliran (stagger).
 * - `saatGulir`: kartu muncul ketika digulir ke layar (untuk bagian di bawah lipatan halaman).
 */
export function KartuProduk({ produk, urutan = 0, saatGulir = false }: { produk: Produk; urutan?: number; saatGulir?: boolean }) {
  const habis = produk.stok <= 0;
  return (
    <Link
      href={`/produk/${produk.slug}`}
      style={{ "--i": urutan } as CSSProperties}
      className={clsx(
        "kartu-muncul group flex flex-col overflow-hidden rounded-2xl border border-garis bg-white transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-pink hover:shadow-lg hover:shadow-rose/10",
        saatGulir && "saat-gulir",
      )}
    >
      <div className="relative">
        <GambarProduk src={produk.gambar} alt={produk.nama_produk} className="aspect-4/5 w-full" sizes="(max-width: 1024px) 50vw, 33vw" zoom />
        {habis ? (
          <span className="absolute left-3 top-3 rounded-full bg-tinta/80 px-2.5 py-1 text-xs font-semibold text-white">
            Habis
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-serif text-lg font-bold italic leading-tight text-tinta sm:text-xl">{produk.nama_produk}</h3>
        {produk.komposisi ? <p className="mt-1 line-clamp-2 text-xs text-abu">{produk.komposisi}</p> : null}
        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="text-xs font-bold text-zaitun-tua sm:text-sm">{rupiah(produk.harga)}</p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-muda text-zaitun-tua transition group-hover:rotate-45 group-hover:bg-rose group-hover:text-white">
            <ArrowUpRight size={16} aria-hidden />
            <span className="sr-only">Lihat produk</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
