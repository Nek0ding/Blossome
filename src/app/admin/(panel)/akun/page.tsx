import type { Metadata } from "next";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { Kartu, Pesan } from "@/components/ui";
import { FormProfil } from "@/components/toko/form-profil";
import { FormUbahPassword } from "@/components/auth/form-auth";
import { wajibAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun Saya" };

export default async function AkunAdmin({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const [profil, { pesan }] = await Promise.all([wajibAdmin(), searchParams]);
  return (
    <>
      <JudulHalaman
        judul="Akun Saya"
        deskripsi={`Masuk sebagai ${profil.email} · ${profil.is_admin_utama ? "Admin utama" : "Admin"}`}
      />
      <div className="grid max-w-3xl gap-6">
        {pesan === "password-diubah" ? <Pesan ok="Password berhasil diubah." /> : null}
        <Kartu>
          <h2 className="mb-4 font-serif text-2xl font-bold">Profil</h2>
          <FormProfil admin nama={profil.nama} noTelp={profil.no_telp ?? ""} alamat={profil.alamat ?? ""} />
        </Kartu>
        <Kartu>
          <h2 className="font-serif text-2xl font-bold">Password</h2>
          <p className="mb-4 mt-1 text-sm text-abu">
            Akun admin dibuat dengan Google? Buat password di sini supaya bisa masuk lewat email dan password juga.
          </p>
          <FormUbahPassword />
        </Kartu>
      </div>
    </>
  );
}
