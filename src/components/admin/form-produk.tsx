"use client";

import { useActionState, useState } from "react";
import { hapusProduk, simpanProduk } from "@/lib/actions/admin";
import { GambarProduk } from "@/components/gambar-produk";
import { Kartu, Kolom, Pesan, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";
import type { Kategori, Produk } from "@/lib/types";

export function FormProduk({ produk, kategori }: { produk?: Produk; kategori: Kategori[] }) {
  const [state, action, pending] = useActionState(simpanProduk, null);
  const [stateHapus, actionHapus, pendingHapus] = useActionState(hapusProduk, null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const baru = !produk;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <FormAksi aksi={action} pending={pending} className="space-y-6">
        {produk ? <input type="hidden" name="id_produk" value={produk.id_produk} /> : null}
        <Kartu className="space-y-4">
          <Kolom label="Nama produk" htmlFor="nama_produk">
            <input id="nama_produk" name="nama_produk" required minLength={3} maxLength={200} defaultValue={produk?.nama_produk} className={kelasInput} />
          </Kolom>
          <div className="grid gap-4 sm:grid-cols-2">
            <Kolom label="Kategori" htmlFor="id_kategori">
              <select id="id_kategori" name="id_kategori" required defaultValue={produk?.id_kategori ?? ""} className={kelasInput}>
                <option value="">Pilih kategori</option>
                {kategori.map((k) => (
                  <option key={k.id_kategori} value={k.id_kategori}>
                    {k.nama_kategori}
                  </option>
                ))}
              </select>
            </Kolom>
            <Kolom label="Harga (Rp)" htmlFor="harga">
              <input id="harga" name="harga" type="number" required min={0} step={1} defaultValue={produk?.harga} className={kelasInput} />
            </Kolom>
            {baru ? (
              <Kolom label="Stok awal" htmlFor="stok_awal" bantuan="Perubahan stok berikutnya lewat menu Inventaris & Stok.">
                <input id="stok_awal" name="stok_awal" type="number" required min={0} max={9999} defaultValue={0} className={kelasInput} />
              </Kolom>
            ) : (
              <Kolom label="Stok sekarang" htmlFor="stok_info" bantuan="Ubah stok lewat menu Inventaris & Stok supaya tercatat di log.">
                <input id="stok_info" value={produk.stok} readOnly disabled className={kelasInput} />
              </Kolom>
            )}
            <Kolom label="Stok minimum" htmlFor="stok_minimum" bantuan="Muncul di peringatan stok menipis kalau stok di bawah angka ini.">
              <input id="stok_minimum" name="stok_minimum" type="number" required min={0} max={9999} defaultValue={produk?.stok_minimum ?? 5} className={kelasInput} />
            </Kolom>
          </div>
          <Kolom label="Komposisi" htmlFor="komposisi" bantuan="Contoh: Mawar Pink, Baby's Breath, Eucalyptus">
            <input id="komposisi" name="komposisi" maxLength={500} defaultValue={produk?.komposisi ?? ""} className={kelasInput} />
          </Kolom>
          <Kolom label="Deskripsi" htmlFor="deskripsi">
            <textarea id="deskripsi" name="deskripsi" rows={4} maxLength={3000} defaultValue={produk?.deskripsi ?? ""} className={kelasInput} />
          </Kolom>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_aktif" defaultChecked={produk?.is_aktif ?? true} className="h-4 w-4 accent-zaitun" />
              Tampil di katalog
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_best_seller" defaultChecked={produk?.is_best_seller ?? false} className="h-4 w-4 accent-zaitun" />
              Tampilkan di Best Seller
            </label>
          </div>
        </Kartu>

        <Kartu className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Foto Produk</h2>
          <div className="flex flex-wrap items-start gap-4">
            {pratinjau ? (
              // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari file yang dipilih
              <img src={pratinjau} alt="Pratinjau foto baru" className="h-40 w-32 rounded-xl object-cover" />
            ) : (
              <GambarProduk src={produk?.gambar} alt={produk?.nama_produk ?? "Produk baru"} className="h-40 w-32 rounded-xl" sizes="128px" />
            )}
            <Kolom label={produk?.gambar ? "Ganti foto" : "Unggah foto"} htmlFor="gambar" bantuan="JPG, PNG, atau WEBP. Maksimal 2 MB. Satu foto per produk.">
              <input
                id="gambar"
                name="gambar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPratinjau(f ? URL.createObjectURL(f) : null);
                }}
                className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-sage file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zaitun-tua"
              />
            </Kolom>
          </div>
        </Kartu>

        <Pesan error={state?.error} />
        <TombolKirim teksProses="Menyimpan…">{baru ? "Simpan Produk" : "Simpan Perubahan"}</TombolKirim>
      </FormAksi>

      {produk ? (
        <Kartu className="h-fit space-y-3">
          <h2 className="font-serif text-2xl font-bold">Hapus Produk</h2>
          <p className="text-sm text-abu">
            Produk yang pernah dipesan tidak dihapus, hanya dinonaktifkan supaya riwayat pesanan tetap utuh.
          </p>
          <FormAksi
            aksi={actionHapus} pending={pendingHapus}
            onSubmit={(e) => {
              if (!window.confirm(`Hapus ${produk.nama_produk}?`)) e.preventDefault();
            }}
            className="space-y-3"
          >
            <input type="hidden" name="id_produk" value={produk.id_produk} />
            <Pesan error={stateHapus?.error} ok={stateHapus?.ok} />
            <TombolKirim varian="bahaya" className="w-full" teksProses="Menghapus…">
              Hapus Produk
            </TombolKirim>
          </FormAksi>
        </Kartu>
      ) : null}
    </div>
  );
}
