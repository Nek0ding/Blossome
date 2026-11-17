"use client";

import { useActionState, useState } from "react";
import { buatAdminBaru, ubahPeranAkun } from "@/lib/actions/kelola-admin";
import { Kolom, Pesan, Tombol, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";

/**
 * Tombol ubah peran dengan langkah konfirmasi (klik sekali untuk memunculkan "Ya", supaya tidak salah tekan).
 */
export function TombolUbahPeran({
  idUser,
  nama,
  peran,
}: {
  idUser: string;
  nama: string;
  /** Peran tujuan */
  peran: "admin" | "customer";
}) {
  const [state, action, pending] = useActionState(ubahPeranAkun, null);
  const [yakin, setYakin] = useState(false);
  const label = peran === "admin" ? "Jadikan admin" : "Cabut akses admin";

  return (
    <div className="space-y-2">
      {yakin ? (
        <FormAksi aksi={action} pending={pending} className="flex flex-wrap items-center justify-end gap-2">
          <input type="hidden" name="id_user" value={idUser} />
          <input type="hidden" name="peran" value={peran} />
          <span className="text-xs text-abu">
            {peran === "admin" ? `Jadikan ${nama} admin?` : `Cabut akses admin ${nama}?`}
          </span>
          <TombolKirim kecil varian={peran === "admin" ? "utama" : "bahaya"} teksProses="Menyimpan…">
            Ya
          </TombolKirim>
          <Tombol type="button" kecil varian="garis" onClick={() => setYakin(false)} disabled={pending}>
            Batal
          </Tombol>
        </FormAksi>
      ) : (
        <div className="flex justify-end">
          <Tombol type="button" kecil varian={peran === "admin" ? "garis" : "bahaya"} onClick={() => setYakin(true)}>
            {label}
          </Tombol>
        </div>
      )}
      <Pesan error={state?.error} ok={state?.ok} />
    </div>
  );
}

/** Form membuat akun admin baru dengan password sementara. */
export function FormAdminBaru() {
  const [state, action, pending] = useActionState(buatAdminBaru, null);
  return (
    <FormAksi aksi={action} pending={pending} className="grid gap-4 sm:grid-cols-2">
      <Kolom label="Nama" htmlFor="admin_nama">
        <input id="admin_nama" name="nama" required minLength={2} maxLength={100} autoComplete="off" className={kelasInput} />
      </Kolom>
      <Kolom label="Email" htmlFor="admin_email">
        <input id="admin_email" name="email" type="email" required maxLength={255} autoComplete="off" className={kelasInput} />
      </Kolom>
      <Kolom label="Password sementara" htmlFor="admin_password" bantuan="Minimal 8 karakter, berisi huruf dan angka.">
        <input
          id="admin_password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={kelasInput}
        />
      </Kolom>
      <Kolom label="Konfirmasi password" htmlFor="admin_konfirmasi">
        <input
          id="admin_konfirmasi"
          name="konfirmasi"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={kelasInput}
        />
      </Kolom>
      <div className="space-y-3 sm:col-span-2">
        <Pesan error={state?.error} ok={state?.ok} />
        <TombolKirim teksProses="Membuat akun…">Buat Akun Admin</TombolKirim>
      </div>
    </FormAksi>
  );
}
