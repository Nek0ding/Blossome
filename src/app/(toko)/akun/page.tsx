import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, LogOut, Package } from "lucide-react";
import { Kartu, Pesan } from "@/components/ui";
import { TombolKirim } from "@/components/form";
import { FormProfil } from "@/components/toko/form-profil";
import { keluar } from "@/lib/actions/auth";
import { getProfil } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun Saya" };

export default async function HalamanAkun({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const profil = await getProfil();
  if (!profil) redirect("/masuk?next=/akun");
  const { pesan } = await searchParams;

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="judul text-5xl">Akun Saya</h1>
        <p className="mt-1 text-sm text-abu">{profil.email}</p>
        {pesan === "password-diubah" ? (
          <div className="mt-4">
            <Pesan ok="Password berhasil diubah." />
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_260px]">
          <Kartu>
            <h2 className="mb-4 font-serif text-2xl font-bold italic">Profil</h2>
            <FormProfil nama={profil.nama} noTelp={profil.no_telp ?? ""} alamat={profil.alamat ?? ""} />
          </Kartu>
          <div className="space-y-3">
            <Link href="/pesanan" className="flex items-center gap-3 rounded-2xl border border-garis bg-white p-4 font-medium hover:border-zaitun">
              <Package size={18} className="text-rose" aria-hidden /> Pesanan Saya
            </Link>
            <Link
              href="/lupa-password"
              className="flex items-center gap-3 rounded-2xl border border-garis bg-white p-4 font-medium hover:border-zaitun"
            >
              <KeyRound size={18} className="text-rose" aria-hidden /> Ganti Password
            </Link>
            <form action={keluar}>
              <TombolKirim varian="bahaya" className="w-full" teksProses="Keluar…">
                <LogOut size={16} aria-hidden /> Keluar
              </TombolKirim>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
