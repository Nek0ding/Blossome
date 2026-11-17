"use client";

import { useActionState } from "react";
import { simpanProfil } from "@/lib/actions/akun";
import { Kolom, Pesan, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";

export function FormProfil({
  nama,
  noTelp,
  alamat,
  admin = false,
}: {
  nama: string;
  noTelp: string;
  alamat: string;
  /** Akun admin tidak berbelanja, jadi kolom alamat tidak ditampilkan. */
  admin?: boolean;
}) {
  const [state, action, pending] = useActionState(simpanProfil, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-4">
      <Kolom label="Nama" htmlFor="nama">
        <input id="nama" name="nama" required minLength={2} maxLength={100} defaultValue={nama} autoComplete="name" className={kelasInput} />
      </Kolom>
      <Kolom label="No. telepon" htmlFor="no_telp" bantuan={admin ? undefined : "Dipakai untuk mengisi data penerima saat checkout."}>
        <input id="no_telp" name="no_telp" inputMode="tel" defaultValue={noTelp} autoComplete="tel" className={kelasInput} />
      </Kolom>
      {admin ? (
        <input type="hidden" name="alamat" value={alamat} />
      ) : (
        <Kolom label="Alamat default" htmlFor="alamat">
          <textarea id="alamat" name="alamat" rows={3} maxLength={500} defaultValue={alamat} autoComplete="street-address" className={kelasInput} />
        </Kolom>
      )}
      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim teksProses="Menyimpan…">Simpan Profil</TombolKirim>
    </FormAksi>
  );
}
