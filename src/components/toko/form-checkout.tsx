"use client";

import { useActionState, useMemo, useState } from "react";
import clsx from "clsx";
import { buatPesanan } from "@/lib/actions/pesanan";
import { Kolom, Pesan, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";
import { rupiah } from "@/lib/format";
import type { PilihanTanggal } from "@/lib/jadwal";
import type { Zona } from "@/lib/types";

export interface ItemCheckout {
  id: number;
  nama: string;
  jumlah: number;
  subtotal: number;
  addon: string[];
  punyaKartu: boolean;
}

export function FormCheckout({
  items,
  subtotal,
  zona,
  jadwal,
  bawaan,
  linkWa,
}: {
  items: ItemCheckout[];
  subtotal: number;
  zona: Zona[];
  jadwal: PilihanTanggal[];
  bawaan: { nama: string; noTelp: string; alamat: string };
  linkWa: string;
}) {
  const [state, action, pending] = useActionState(buatPesanan, null);
  const [metode, setMetode] = useState<"kirim" | "ambil">("kirim");
  const [idZona, setIdZona] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(jadwal[0]?.nilai ?? "");
  const [slot, setSlot] = useState<string>("");

  const slotTersedia = useMemo(() => jadwal.find((j) => j.nilai === tanggal)?.slot ?? [], [jadwal, tanggal]);
  const ongkir = metode === "kirim" ? (zona.find((z) => String(z.id_zona) === idZona)?.tarif ?? 0) : 0;

  return (
    <FormAksi aksi={action} pending={pending} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-garis bg-white p-5 sm:p-6">
          <h2 className="font-serif text-2xl font-bold italic">Data Penerima</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Kolom label="Nama penerima" htmlFor="nama_penerima">
              <input
                id="nama_penerima"
                name="nama_penerima"
                required
                minLength={2}
                maxLength={100}
                defaultValue={bawaan.nama}
                autoComplete="name"
                className={kelasInput}
              />
            </Kolom>
            <Kolom label="No. telepon penerima" htmlFor="no_telp_penerima" bantuan="Contoh: 081234567890">
              <input
                id="no_telp_penerima"
                name="no_telp_penerima"
                required
                inputMode="tel"
                minLength={8}
                maxLength={18}
                defaultValue={bawaan.noTelp}
                autoComplete="tel"
                className={kelasInput}
              />
            </Kolom>
          </div>
        </section>

        <section className="rounded-2xl border border-garis bg-white p-5 sm:p-6">
          <h2 className="font-serif text-2xl font-bold italic">Pengiriman</h2>
          <fieldset className="mt-4">
            <legend className="sr-only">Metode</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { nilai: "kirim", judul: "Dikirim ke alamat", ket: "Ongkir sesuai area" },
                  { nilai: "ambil", judul: "Ambil di toko", ket: "Gratis" },
                ] as const
              ).map((m) => (
                <label
                  key={m.nilai}
                  className={clsx(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
                    metode === m.nilai ? "border-zaitun bg-sage-muda" : "border-garis",
                  )}
                >
                  <input
                    type="radio"
                    name="metode"
                    value={m.nilai}
                    checked={metode === m.nilai}
                    onChange={() => setMetode(m.nilai)}
                    className="mt-1 accent-zaitun"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{m.judul}</span>
                    <span className="block text-xs text-abu">{m.ket}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {metode === "kirim" ? (
            <div className="mt-4 space-y-4">
              <Kolom
                label="Area pengiriman"
                htmlFor="id_zona"
                bantuan={
                  <>
                    Alamat di luar area ini belum bisa kami layani.{" "}
                    <a href={linkWa} target="_blank" rel="noopener noreferrer" className="font-semibold text-rose hover:underline">
                      Tanya lewat WhatsApp
                    </a>
                  </>
                }
              >
                <select
                  id="id_zona"
                  name="id_zona"
                  required
                  value={idZona}
                  onChange={(e) => setIdZona(e.target.value)}
                  className={kelasInput}
                >
                  <option value="">Pilih area</option>
                  {zona.map((z) => (
                    <option key={z.id_zona} value={z.id_zona}>
                      {z.nama_zona} ({rupiah(z.tarif)})
                    </option>
                  ))}
                </select>
              </Kolom>
              <Kolom label="Alamat lengkap" htmlFor="alamat" bantuan="Nama jalan, nomor rumah, RT/RW, kelurahan, patokan.">
                <textarea
                  id="alamat"
                  name="alamat"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  defaultValue={bawaan.alamat}
                  autoComplete="street-address"
                  className={kelasInput}
                />
              </Kolom>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-krem-tua px-4 py-3 text-sm text-abu">
              Ambil buketmu di toko pada tanggal dan jam yang dipilih. Alamat toko ada di halaman pesanan dan di bagian Contact Us.
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                {jadwal.length === 0 ? <option value="">Tidak ada jadwal tersedia</option> : null}
                {jadwal.map((j) => (
                  <option key={j.nilai} value={j.nilai}>
                    {j.label}
                  </option>
                ))}
              </select>
            </Kolom>
            <Kolom label="Jam" htmlFor="slot_kirim">
              <select
                id="slot_kirim"
                name="slot_kirim"
                required
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className={kelasInput}
              >
                <option value="">Pilih jam</option>
                {slotTersedia.map((s) => (
                  <option key={s.nilai} value={s.nilai}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Kolom>
          </div>
        </section>

        <section className="rounded-2xl border border-garis bg-white p-5 sm:p-6">
          <h2 className="font-serif text-2xl font-bold italic">Pesanan</h2>
          <ul className="mt-4 space-y-4">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-garis p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {item.nama} × {item.jumlah}
                    </p>
                    {item.addon.length > 0 ? <p className="text-xs text-abu">+ {item.addon.join(", ")}</p> : null}
                  </div>
                  <p className="shrink-0 font-semibold text-zaitun-tua">{rupiah(item.subtotal)}</p>
                </div>
                {item.punyaKartu ? (
                  <div className="mt-3">
                    <Kolom label="Ucapan kartu" htmlFor={`ucapan_${item.id}`} bantuan="Maksimal 300 karakter.">
                      <textarea
                        id={`ucapan_${item.id}`}
                        name={`ucapan_${item.id}`}
                        rows={3}
                        maxLength={300}
                        placeholder="Selamat wisuda! Semoga sukses selalu."
                        className={kelasInput}
                      />
                    </Kolom>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Kolom label="Catatan untuk florist (opsional)" htmlFor="catatan">
              <textarea id="catatan" name="catatan" rows={2} maxLength={500} className={kelasInput} />
            </Kolom>
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-garis bg-white p-5 sm:p-6 lg:sticky lg:top-28">
        <h2 className="font-serif text-2xl font-bold italic">Ringkasan</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-abu">Subtotal</dt>
            <dd className="font-semibold">{rupiah(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-abu">Ongkir</dt>
            <dd className="font-semibold">{metode === "ambil" ? "Gratis" : idZona ? rupiah(ongkir) : "–"}</dd>
          </div>
          <div className="flex justify-between border-t border-garis pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-zaitun-tua">{rupiah(subtotal + ongkir)}</dd>
          </div>
        </dl>
        <p className="text-xs text-abu">
          Setelah menekan tombol di bawah, stok disiapkan untukmu dan QRIS muncul. Selesaikan pembayaran sebelum batas waktu.
        </p>
        <Pesan error={state?.error} />
        <TombolKirim className="w-full py-3" teksProses="Membuat pesanan…" disabled={jadwal.length === 0}>
          Bayar dengan QRIS
        </TombolKirim>
      </aside>
    </FormAksi>
  );
}
