"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { hapusAddon, hapusKategori, hapusZona, simpanAddon, simpanKategori, simpanZona } from "@/lib/actions/admin";
import { GambarProduk } from "@/components/gambar-produk";
import { Kolom, Pesan, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";
import type { Addon, FormState, Kategori, Zona } from "@/lib/types";

/** Reset isi form setelah tambah data berhasil. */
function useResetSaatOk(state: FormState, aktif: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (aktif && state?.ok) ref.current?.reset();
  }, [state, aktif]);
  return ref;
}

function TombolHapus({
  aksi,
  nama,
  id,
  label,
}: {
  aksi: (prev: FormState, fd: FormData) => Promise<FormState>;
  nama: string;
  id: number;
  label: string;
}) {
  const [state, action, pending] = useActionState(aksi, null);
  return (
    <FormAksi
      aksi={action} pending={pending}
      onSubmit={(e) => {
        if (!window.confirm(`Hapus ${label}?`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name={nama} value={id} />
      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim varian="bahaya" kecil teksProses="Menghapus…">
        Hapus
      </TombolKirim>
    </FormAksi>
  );
}

/* ---------- Kategori ---------- */

export function FormKategori({ kategori, jumlahProduk }: { kategori?: Kategori; jumlahProduk?: number }) {
  const [state, action, pending] = useActionState(simpanKategori, null);
  const ref = useResetSaatOk(state, !kategori);
  return (
    <div className="space-y-3">
      <FormAksi ref={ref} aksi={action} pending={pending} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        {kategori ? <input type="hidden" name="id_kategori" value={kategori.id_kategori} /> : null}
        <Kolom label="Nama kategori" htmlFor={`nama-${kategori?.id_kategori ?? "baru"}`}>
          <input id={`nama-${kategori?.id_kategori ?? "baru"}`} name="nama" required minLength={2} maxLength={100} defaultValue={kategori?.nama_kategori} className={kelasInput} />
        </Kolom>
        <Kolom label="Deskripsi" htmlFor={`desk-${kategori?.id_kategori ?? "baru"}`}>
          <input id={`desk-${kategori?.id_kategori ?? "baru"}`} name="deskripsi" maxLength={500} defaultValue={kategori?.deskripsi ?? ""} className={kelasInput} />
        </Kolom>
        <TombolKirim varian={kategori ? "garis" : "utama"} teksProses="Menyimpan…">
          {kategori ? "Simpan" : "Tambah"}
        </TombolKirim>
      </FormAksi>
      <Pesan error={state?.error} ok={state?.ok} />
      {kategori ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-abu">
          <span>
            Slug: /katalog?kategori={kategori.slug} · {jumlahProduk ?? 0} produk
          </span>
          <TombolHapus aksi={hapusKategori} nama="id_kategori" id={kategori.id_kategori} label={`kategori ${kategori.nama_kategori}`} />
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Addon ---------- */

export function FormAddon({ addon }: { addon?: Addon }) {
  const [state, action, pending] = useActionState(simpanAddon, null);
  const ref = useResetSaatOk(state, !addon);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const id = addon?.id_addon ?? "baru";
  return (
    <div className="space-y-3">
      <FormAksi ref={ref} aksi={action} pending={pending} className="space-y-4">
        {addon ? <input type="hidden" name="id_addon" value={addon.id_addon} /> : null}
        <div className="flex gap-4">
          {pratinjau ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal
            <img src={pratinjau} alt="Pratinjau foto" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
          ) : (
            <GambarProduk src={addon?.gambar} alt={addon?.nama_addon ?? "Addon baru"} className="h-20 w-20 shrink-0 rounded-xl" sizes="80px" />
          )}
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Kolom label="Nama addon" htmlFor={`nama-addon-${id}`}>
              <input id={`nama-addon-${id}`} name="nama_addon" required minLength={2} maxLength={100} defaultValue={addon?.nama_addon} className={kelasInput} />
            </Kolom>
            <Kolom label="Harga (Rp)" htmlFor={`harga-addon-${id}`}>
              <input id={`harga-addon-${id}`} name="harga" type="number" required min={0} step={1} defaultValue={addon?.harga} className={kelasInput} />
            </Kolom>
            {addon ? (
              <Kolom label="Stok" htmlFor={`stok-addon-${id}`} bantuan="Ubah lewat Inventaris & Stok.">
                <input id={`stok-addon-${id}`} value={addon.stok} readOnly disabled className={kelasInput} />
              </Kolom>
            ) : (
              <Kolom label="Stok awal" htmlFor={`stok-addon-${id}`}>
                <input id={`stok-addon-${id}`} name="stok_awal" type="number" required min={0} max={9999} defaultValue={0} className={kelasInput} />
              </Kolom>
            )}
            <Kolom label="Stok minimum" htmlFor={`min-addon-${id}`}>
              <input id={`min-addon-${id}`} name="stok_minimum" type="number" required min={0} max={9999} defaultValue={addon?.stok_minimum ?? 5} className={kelasInput} />
            </Kolom>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_aktif" defaultChecked={addon?.is_aktif ?? true} className="h-4 w-4 accent-zaitun" /> Aktif
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_kartu_ucapan" defaultChecked={addon?.is_kartu_ucapan ?? false} className="h-4 w-4 accent-zaitun" />
            Ini kartu ucapan (memunculkan kolom ucapan)
          </label>
          <label className="flex items-center gap-2">
            <span className="sr-only">Foto addon</span>
            <input
              type="file"
              name="gambar"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPratinjau(f ? URL.createObjectURL(f) : null);
              }}
              className="block max-w-56 text-xs file:mr-2 file:rounded-full file:border-0 file:bg-sage file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zaitun-tua"
            />
          </label>
        </div>
        <TombolKirim varian={addon ? "garis" : "utama"} kecil teksProses="Menyimpan…">
          {addon ? "Simpan" : "Tambah Addon"}
        </TombolKirim>
      </FormAksi>
      <Pesan error={state?.error} ok={state?.ok} />
      {addon ? <TombolHapus aksi={hapusAddon} nama="id_addon" id={addon.id_addon} label={`addon ${addon.nama_addon}`} /> : null}
    </div>
  );
}

/* ---------- Zona pengiriman ---------- */

export function FormZona({ zona }: { zona?: Zona }) {
  const [state, action, pending] = useActionState(simpanZona, null);
  const ref = useResetSaatOk(state, !zona);
  const id = zona?.id_zona ?? "baru";
  return (
    <div className="space-y-2">
      <FormAksi ref={ref} aksi={action} pending={pending} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_90px_auto_auto] sm:items-end">
        {zona ? <input type="hidden" name="id_zona" value={zona.id_zona} /> : null}
        <Kolom label="Area" htmlFor={`zona-${id}`}>
          <input id={`zona-${id}`} name="nama_zona" required minLength={2} maxLength={100} defaultValue={zona?.nama_zona} className={kelasInput} />
        </Kolom>
        <Kolom label="Tarif (Rp)" htmlFor={`tarif-${id}`}>
          <input id={`tarif-${id}`} name="tarif" type="number" required min={0} step={1} defaultValue={zona?.tarif} className={kelasInput} />
        </Kolom>
        <Kolom label="Urutan" htmlFor={`urutan-${id}`}>
          <input id={`urutan-${id}`} name="urutan" type="number" min={0} max={999} defaultValue={zona?.urutan ?? 0} className={kelasInput} />
        </Kolom>
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="is_aktif" defaultChecked={zona?.is_aktif ?? true} className="h-4 w-4 accent-zaitun" /> Aktif
        </label>
        <TombolKirim varian={zona ? "garis" : "utama"} teksProses="…">
          {zona ? "Simpan" : "Tambah"}
        </TombolKirim>
      </FormAksi>
      <Pesan error={state?.error} ok={state?.ok} />
      {zona ? <TombolHapus aksi={hapusZona} nama="id_zona" id={zona.id_zona} label={`area ${zona.nama_zona}`} /> : null}
    </div>
  );
}
