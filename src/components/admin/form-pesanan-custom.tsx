"use client";

import { useActionState, useMemo, useState } from "react";
import { buatPesananCustom } from "@/lib/actions/admin";
import { Kartu, Kolom, Pesan, kelasInput } from "@/components/ui";
import { cn } from "@/lib/cn";
import { FormAksi, TombolKirim } from "@/components/form";
import { rupiah } from "@/lib/format";
import type { PilihanTanggal } from "@/lib/jadwal";
import type { Addon, Zona } from "@/lib/types";

export interface PelangganPilihan {
  id: string;
  nama: string;
  email: string;
  no_telp: string | null;
  alamat: string | null;
}

export function FormPesananCustom({
  pelanggan,
  addons,
  zona,
  jadwal,
}: {
  pelanggan: PelangganPilihan[];
  addons: Addon[];
  zona: Zona[];
  jadwal: PilihanTanggal[];
}) {
  const [state, action, pending] = useActionState(buatPesananCustom, null);
  const [cari, setCari] = useState("");
  const [idUser, setIdUser] = useState("");
  const [harga, setHarga] = useState("");
  const [jumlah, setJumlah] = useState("1");
  const [qtyAddon, setQtyAddon] = useState<Record<number, number>>({});
  const [metode, setMetode] = useState<"kirim" | "ambil">("kirim");
  const [idZona, setIdZona] = useState("");
  const [tanggal, setTanggal] = useState(jadwal[0]?.nilai ?? "");
  const [slot, setSlot] = useState("");

  const disaring = useMemo(() => {
    const k = cari.trim().toLowerCase();
    if (!k) return pelanggan;
    return pelanggan.filter((p) => p.nama.toLowerCase().includes(k) || p.email.toLowerCase().includes(k) || (p.no_telp ?? "").includes(k));
  }, [cari, pelanggan]);
  const dipilih = pelanggan.find((p) => p.id === idUser);
  const slotTersedia = jadwal.find((j) => j.nilai === tanggal)?.slot ?? [];
  const adaKartu = addons.some((a) => a.is_kartu_ucapan && (qtyAddon[a.id_addon] ?? 0) > 0);

  const subtotalItem = (Number(harga) || 0) * (Number(jumlah) || 0);
  const subtotalAddon = addons.reduce((n, a) => n + (qtyAddon[a.id_addon] ?? 0) * a.harga, 0);
  const ongkir = metode === "kirim" ? (zona.find((z) => String(z.id_zona) === idZona)?.tarif ?? 0) : 0;

  return (
    <FormAksi aksi={action} pending={pending} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Kartu className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">1. Pelanggan</h2>
          <p className="text-sm text-abu">Pelanggan harus sudah punya akun supaya bisa membayar dari halaman Pesanan Saya.</p>
          <Kolom label="Cari pelanggan" htmlFor="cari-pelanggan">
            <input
              id="cari-pelanggan"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Nama, email, atau nomor telepon"
              className={kelasInput}
            />
          </Kolom>
          <Kolom label="Akun pelanggan" htmlFor="id_user">
            <select id="id_user" name="id_user" required value={idUser} onChange={(e) => setIdUser(e.target.value)} className={kelasInput}>
              <option value="">Pilih pelanggan ({disaring.length})</option>
              {disaring.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} · {p.email}
                </option>
              ))}
            </select>
          </Kolom>
        </Kartu>

        <Kartu className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">2. Item Custom</h2>
          <Kolom label="Nama item" htmlFor="nama_item">
            <input id="nama_item" name="nama_item" required minLength={3} maxLength={200} placeholder="Custom Money Bouquet 20 lembar" className={kelasInput} />
          </Kolom>
          <Kolom label="Detail desain" htmlFor="deskripsi" bantuan="Bunga, warna kertas, ukuran, dan permintaan lain yang sudah disepakati.">
            <textarea id="deskripsi" name="deskripsi" rows={3} maxLength={1000} className={kelasInput} />
          </Kolom>
          <div className="grid gap-4 sm:grid-cols-2">
            <Kolom label="Harga per buket (Rp)" htmlFor="harga">
              <input
                id="harga"
                name="harga"
                required
                type="number"
                min={1000}
                step={1}
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className={kelasInput}
              />
            </Kolom>
            <Kolom label="Jumlah" htmlFor="jumlah">
              <input
                id="jumlah"
                name="jumlah"
                required
                type="number"
                min={1}
                max={99}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className={kelasInput}
              />
            </Kolom>
          </div>
          {addons.length > 0 ? (
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-semibold">Addon (opsional)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {addons.map((a) => (
                  <label key={a.id_addon} className="flex items-center justify-between gap-3 rounded-xl border border-garis px-3 py-2 text-sm">
                    <span>
                      {a.nama_addon} <span className="text-xs text-abu">({rupiah(a.harga)}, stok {a.stok})</span>
                    </span>
                    <input
                      type="number"
                      name={`addon_${a.id_addon}`}
                      min={0}
                      max={Math.min(99, a.stok)}
                      value={qtyAddon[a.id_addon] ?? 0}
                      onChange={(e) => setQtyAddon((q) => ({ ...q, [a.id_addon]: Math.max(0, Number(e.target.value) || 0) }))}
                      className={cn(kelasInput, "w-20 py-1.5")}
                      aria-label={`Jumlah ${a.nama_addon}`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {adaKartu ? (
            <Kolom label="Ucapan kartu" htmlFor="ucapan" bantuan="Maksimal 300 karakter.">
              <textarea id="ucapan" name="ucapan" rows={2} maxLength={300} className={kelasInput} />
            </Kolom>
          ) : null}
        </Kartu>

        <Kartu className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">3. Penerima & Jadwal</h2>
          <div className="grid gap-4 sm:grid-cols-2" key={`penerima-${dipilih?.id ?? ""}`}>
            <Kolom label="Nama penerima" htmlFor="nama_penerima">
              <input id="nama_penerima" name="nama_penerima" required defaultValue={dipilih?.nama ?? ""} className={kelasInput} />
            </Kolom>
            <Kolom label="No. telepon penerima" htmlFor="no_telp_penerima">
              <input id="no_telp_penerima" name="no_telp_penerima" required inputMode="tel" defaultValue={dipilih?.no_telp ?? ""} className={kelasInput} />
            </Kolom>
          </div>
          <fieldset className="flex min-w-0 flex-wrap gap-4 text-sm">
            <legend className="mb-2 text-sm font-semibold">Metode</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="metode" value="kirim" checked={metode === "kirim"} onChange={() => setMetode("kirim")} className="accent-zaitun" />
              Dikirim ke alamat
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="metode" value="ambil" checked={metode === "ambil"} onChange={() => setMetode("ambil")} className="accent-zaitun" />
              Ambil di toko
            </label>
          </fieldset>
          {metode === "kirim" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Kolom label="Area pengiriman" htmlFor="id_zona">
                <select id="id_zona" name="id_zona" required value={idZona} onChange={(e) => setIdZona(e.target.value)} className={kelasInput}>
                  <option value="">Pilih area</option>
                  {zona.map((z) => (
                    <option key={z.id_zona} value={z.id_zona}>
                      {z.nama_zona} ({rupiah(z.tarif)})
                    </option>
                  ))}
                </select>
              </Kolom>
              <Kolom label="Alamat lengkap" htmlFor="alamat" className="sm:col-span-2" key={`alamat-${dipilih?.id ?? ""}`}>
                <textarea id="alamat" name="alamat" required minLength={10} rows={2} defaultValue={dipilih?.alamat ?? ""} className={kelasInput} />
              </Kolom>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Kolom label="Tanggal" htmlFor="tanggal_kirim">
              <select
                id="tanggal_kirim"
                name="tanggal_kirim"
                required
                value={tanggal}
                onChange={(e) => {
                  setTanggal(e.target.value);
                  setSlot("");
                }}
                className={kelasInput}
              >
                {jadwal.map((j) => (
                  <option key={j.nilai} value={j.nilai}>
                    {j.label}
                  </option>
                ))}
              </select>
            </Kolom>
            <Kolom label="Jam" htmlFor="slot_kirim">
              <select id="slot_kirim" name="slot_kirim" required value={slot} onChange={(e) => setSlot(e.target.value)} className={kelasInput}>
                <option value="">Pilih jam</option>
                {slotTersedia.map((s) => (
                  <option key={s.nilai} value={s.nilai}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Kolom>
          </div>
          <Kolom label="Catatan (opsional)" htmlFor="catatan">
            <textarea id="catatan" name="catatan" rows={2} maxLength={500} className={kelasInput} />
          </Kolom>
        </Kartu>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-garis bg-white p-5 xl:sticky xl:top-24">
        <h2 className="font-serif text-2xl font-bold">Ringkasan</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-abu">Item custom</dt>
            <dd>{rupiah(subtotalItem)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-abu">Addon</dt>
            <dd>{rupiah(subtotalAddon)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-abu">Ongkir</dt>
            <dd>{metode === "ambil" ? "Gratis" : rupiah(ongkir)}</dd>
          </div>
          <div className="flex justify-between border-t border-garis pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="text-zaitun-tua">{rupiah(subtotalItem + subtotalAddon + ongkir)}</dd>
          </div>
        </dl>
        <p className="text-xs text-abu">Pelanggan punya waktu 24 jam untuk membayar. Setiap QRIS berlaku sesuai batas bayar di pengaturan.</p>
        <Pesan error={state?.error} />
        <TombolKirim className="w-full" teksProses="Membuat pesanan…">
          Buat Pesanan Custom
        </TombolKirim>
      </aside>
    </FormAksi>
  );
}
