"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { simpanOperasional, simpanProfilToko, simpanTemplateEmail } from "@/lib/actions/admin";
import { Kolom, Pesan, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";
import { NAMA_HARI, type PengaturanToko } from "@/lib/types";

export function FormProfilToko({ toko }: { toko: PengaturanToko }) {
  const [state, action, pending] = useActionState(simpanProfilToko, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom label="Nama toko" htmlFor="nama_toko">
          <input id="nama_toko" name="nama_toko" required maxLength={100} defaultValue={toko.nama_toko} className={kelasInput} />
        </Kolom>
        <Kolom label="Nomor WhatsApp" htmlFor="no_whatsapp" bantuan="Format 62xxxx. Dipakai untuk tombol chat dan custom bouquet.">
          <input id="no_whatsapp" name="no_whatsapp" required inputMode="tel" defaultValue={toko.no_whatsapp ?? ""} className={kelasInput} />
        </Kolom>
        <Kolom label="Email toko" htmlFor="email" bantuan="Menerima email setiap ada orderan masuk (sudah dibayar).">
          <input id="email" name="email" type="email" defaultValue={toko.email ?? ""} className={kelasInput} />
        </Kolom>
        <Kolom label="Kota / Kabupaten" htmlFor="kota">
          <input id="kota" name="kota" maxLength={100} defaultValue={toko.kota ?? ""} className={kelasInput} />
        </Kolom>
        <Kolom label="Alamat toko" htmlFor="alamat" className="sm:col-span-2">
          <input id="alamat" name="alamat" maxLength={300} defaultValue={toko.alamat ?? ""} className={kelasInput} />
        </Kolom>
        <Kolom label="Kode pos" htmlFor="kode_pos">
          <input id="kode_pos" name="kode_pos" maxLength={10} defaultValue={toko.kode_pos ?? ""} className={kelasInput} />
        </Kolom>
      </div>
      <Kolom label="Deskripsi toko" htmlFor="deskripsi">
        <textarea id="deskripsi" name="deskripsi" rows={2} maxLength={500} defaultValue={toko.deskripsi ?? ""} className={kelasInput} />
      </Kolom>
      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim teksProses="Menyimpan…">Simpan Profil Toko</TombolKirim>
    </FormAksi>
  );
}

export function FormOperasional({ toko }: { toko: PengaturanToko }) {
  const [state, action, pending] = useActionState(simpanOperasional, null);
  const [slot, setSlot] = useState(toko.slot_kirim.map((s, i) => ({ ...s, kunci: i })));

  return (
    <FormAksi aksi={action} pending={pending} className="space-y-6">
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_buka" defaultChecked={toko.is_buka} className="h-4 w-4 accent-zaitun" />
          <span>
            <span className="font-semibold">Toko buka</span>
            <span className="block text-xs text-abu">Kalau dimatikan, pelanggan tidak bisa checkout.</span>
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="terima_preorder" defaultChecked={toko.terima_preorder} className="h-4 w-4 accent-zaitun" />
          <span>
            <span className="font-semibold">Terima pesanan untuk hari lain</span>
            <span className="block text-xs text-abu">Pre-order sampai 14 hari ke depan.</span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom label="Jam cut-off same-day" htmlFor="jam_cutoff" bantuan="Lewat jam ini, pesanan untuk hari ini ditutup.">
          <input id="jam_cutoff" name="jam_cutoff" type="time" required defaultValue={toko.jam_cutoff.slice(0, 5)} className={kelasInput} />
        </Kolom>
        <Kolom label="Batas waktu bayar (menit)" htmlFor="batas_bayar_menit" bantuan="5–60 menit. QRIS dan pesanan kedaluwarsa setelah ini.">
          <input id="batas_bayar_menit" name="batas_bayar_menit" type="number" min={5} max={60} required defaultValue={toko.batas_bayar_menit} className={kelasInput} />
        </Kolom>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Jam operasional (WIB)</legend>
        <div className="overflow-x-auto rounded-xl border border-garis">
          <table className="w-full min-w-[420px] text-sm">
            <tbody>
              {NAMA_HARI.map((h) => {
                const jam = toko.jam_operasional[h] ?? { buka: "09:00", tutup: "18:00", libur: false };
                return (
                  <tr key={h} className="border-b border-garis last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-medium capitalize">
                      {h}
                    </th>
                    <td className="px-3 py-2">
                      <input type="time" name={`${h}_buka`} defaultValue={jam.buka} aria-label={`Jam buka ${h}`} className={kelasInput + " py-1.5"} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="time" name={`${h}_tutup`} defaultValue={jam.tutup} aria-label={`Jam tutup ${h}`} className={kelasInput + " py-1.5"} />
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2 whitespace-nowrap">
                        <input type="checkbox" name={`${h}_libur`} defaultChecked={jam.libur} className="h-4 w-4 accent-rose" /> Tutup
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Slot jam kirim</legend>
        <ul className="space-y-2">
          {slot.map((s, i) => (
            <li key={s.kunci} className="flex flex-wrap items-center gap-2">
              <input type="time" name={`slot_${i}_mulai`} defaultValue={s.mulai} required aria-label={`Slot ${i + 1} mulai`} className={kelasInput + " w-32 py-1.5"} />
              <span className="text-abu">sampai</span>
              <input type="time" name={`slot_${i}_selesai`} defaultValue={s.selesai} required aria-label={`Slot ${i + 1} selesai`} className={kelasInput + " w-32 py-1.5"} />
              {slot.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setSlot((x) => x.filter((y) => y.kunci !== s.kunci))}
                  aria-label={`Hapus slot ${i + 1}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-abu hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {slot.length < 8 ? (
          <button
            type="button"
            onClick={() => setSlot((x) => [...x, { mulai: "", selesai: "", kunci: Date.now() }])}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rose hover:underline"
          >
            <Plus size={16} aria-hidden /> Tambah slot
          </button>
        ) : null}
      </fieldset>

      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim teksProses="Menyimpan…">Simpan Operasional</TombolKirim>
    </FormAksi>
  );
}

export function FormTemplateEmail({ toko }: { toko: PengaturanToko }) {
  const [state, action, pending] = useActionState(simpanTemplateEmail, null);
  const t = toko.template_email;
  const blok = (kunci: "pembayaran_berhasil" | "orderan_masuk", judul: string, ket: string) => (
    <div className="space-y-3 rounded-xl border border-garis p-4">
      <div>
        <p className="font-semibold">{judul}</p>
        <p className="text-xs text-abu">{ket}</p>
      </div>
      <Kolom label="Subjek" htmlFor={`${kunci}_subjek`}>
        <input id={`${kunci}_subjek`} name={`${kunci}_subjek`} required maxLength={150} defaultValue={t[kunci]?.subjek} className={kelasInput} />
      </Kolom>
      <Kolom label="Isi" htmlFor={`${kunci}_isi`}>
        <textarea id={`${kunci}_isi`} name={`${kunci}_isi`} required rows={6} maxLength={3000} defaultValue={t[kunci]?.isi} className={kelasInput + " font-mono text-xs"} />
      </Kolom>
    </div>
  );
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-4">
      <p className="text-sm text-abu">
        Variabel yang bisa dipakai: <code>{"{nomor_pesanan}"}</code>, <code>{"{nama_pelanggan}"}</code>, <code>{"{total}"}</code>,{" "}
        <code>{"{nama_toko}"}</code>.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {blok("pembayaran_berhasil", "Pembayaran berhasil", "Dikirim ke email pelanggan setelah QRIS lunas.")}
        {blok("orderan_masuk", "Orderan masuk", "Dikirim ke email toko setelah QRIS lunas.")}
      </div>
      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim teksProses="Menyimpan…">Simpan Template</TombolKirim>
    </FormAksi>
  );
}
