import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { GambarProduk } from "@/components/gambar-produk";
import { Kartu, Kosong, kelasInput, kelasTombol } from "@/components/ui";
import { TombolKirim } from "@/components/form";
import { hapusDariKeranjang, ubahJumlahKeranjang } from "@/lib/actions/keranjang";
import { wajibLogin } from "@/lib/auth";
import { getKeranjang, subtotalKeranjang } from "@/lib/data";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Keranjang" };

export default async function HalamanKeranjang() {
  const sesi = await wajibLogin("/keranjang");
  const items = await getKeranjang(sesi.id);
  const total = items.reduce((n, i) => n + subtotalKeranjang(i), 0);
  const adaMasalah = items.some(
    (i) =>
      !i.produk?.is_aktif ||
      (i.produk?.stok ?? 0) < i.jumlah ||
      i.keranjang_addon.some((a) => !a.addon?.is_aktif || (a.addon?.stok ?? 0) < a.jumlah),
  );

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="judul text-5xl">Keranjang</h1>

        {items.length === 0 ? (
          <div className="mt-8">
            <Kosong judul="Keranjangmu masih kosong">
              <p>Pilih buket favoritmu dulu dari katalog.</p>
              <Link href="/katalog" className={kelasTombol("utama") + " mt-5"}>
                Lihat Katalog
              </Link>
            </Kosong>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <ul className="space-y-4">
              {items.map((item) => {
                const produk = item.produk;
                const stokKurang = !produk?.is_aktif || (produk?.stok ?? 0) < item.jumlah;
                return (
                  <li key={item.id_keranjang_item}>
                    <Kartu className="flex gap-4">
                      <GambarProduk
                        src={produk?.gambar}
                        alt={produk?.nama_produk ?? "Produk"}
                        className="h-28 w-24 shrink-0 rounded-xl"
                        sizes="96px"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={produk ? `/produk/${produk.slug}` : "/katalog"}
                              className="font-serif text-xl font-bold italic text-tinta hover:text-rose"
                            >
                              {produk?.nama_produk ?? "Produk tidak tersedia"}
                            </Link>
                            <p className="text-sm text-abu">{rupiah(produk?.harga)} / buket</p>
                          </div>
                          <form action={hapusDariKeranjang}>
                            <input type="hidden" name="id" value={item.id_keranjang_item} />
                            <button
                              type="submit"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-abu hover:bg-red-50 hover:text-red-700"
                              aria-label={`Hapus ${produk?.nama_produk ?? "item"} dari keranjang`}
                            >
                              <Trash2 size={18} aria-hidden />
                            </button>
                          </form>
                        </div>

                        {item.keranjang_addon.length > 0 ? (
                          <ul className="mt-2 space-y-0.5 text-sm text-abu">
                            {item.keranjang_addon.map((a) => (
                              <li key={a.id}>
                                + {a.addon?.nama_addon ?? "Addon"} × {a.jumlah}{" "}
                                <span className="text-xs">({rupiah((a.addon?.harga ?? 0) * a.jumlah)})</span>
                                {a.addon && (!a.addon.is_aktif || a.addon.stok < a.jumlah) ? (
                                  <span className="ml-1 text-xs font-semibold text-red-700">stok tidak cukup</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <form action={ubahJumlahKeranjang} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={item.id_keranjang_item} />
                            <label htmlFor={`jumlah-${item.id_keranjang_item}`} className="text-sm text-abu">
                              Jumlah
                            </label>
                            <input
                              id={`jumlah-${item.id_keranjang_item}`}
                              name="jumlah"
                              type="number"
                              min={1}
                              max={99}
                              defaultValue={item.jumlah}
                              className={kelasInput + " w-20 py-1.5"}
                            />
                            <TombolKirim varian="garis" kecil teksProses="…">
                              Ubah
                            </TombolKirim>
                          </form>
                          <p className="font-bold text-zaitun-tua">{rupiah(subtotalKeranjang(item))}</p>
                        </div>
                        {stokKurang ? (
                          <p className="mt-2 text-xs font-semibold text-red-700">
                            {produk?.is_aktif ? `Stok tinggal ${produk.stok}. Kurangi jumlahnya.` : "Produk ini sudah tidak tersedia. Hapus dari keranjang."}
                          </p>
                        ) : null}
                      </div>
                    </Kartu>
                  </li>
                );
              })}
            </ul>

            <Kartu className="h-fit space-y-4 lg:sticky lg:top-28">
              <h2 className="font-serif text-2xl font-bold italic">Ringkasan</h2>
              <div className="flex justify-between text-sm">
                <span className="text-abu">Subtotal ({items.length} item)</span>
                <span className="font-semibold">{rupiah(total)}</span>
              </div>
              <p className="text-xs text-abu">Ongkir dihitung di halaman checkout sesuai area pengiriman.</p>
              {adaMasalah ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                  Ada item dengan stok yang tidak cukup. Perbaiki dulu sebelum checkout.
                </p>
              ) : null}
              {adaMasalah ? (
                <span className={kelasTombol("utama") + " pointer-events-none w-full opacity-60"} aria-disabled="true">
                  Checkout
                </span>
              ) : (
                <Link href="/checkout" className={kelasTombol("utama") + " w-full"}>
                  Checkout
                </Link>
              )}
              <Link href="/katalog" className="block text-center text-sm font-medium text-zaitun-tua hover:underline">
                Lanjut belanja
              </Link>
            </Kartu>
          </div>
        )}
      </div>
    </div>
  );
}
