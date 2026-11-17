import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogOut, Package } from "lucide-react";
import { Kartu, Pesan } from "@/components/ui";
import { TombolKirim } from "@/components/form";
import { FormProfil } from "@/components/toko/form-profil";
import { FormUbahPassword } from "@/components/auth/form-auth";
import { keluar } from "@/lib/actions/auth";
import { getProfil } from "@/lib/auth";

export const metadata: Metadata = { title: "Akun Saya" };

const KELAS_MENU =
  "flex items-center gap-3 rounded-2xl border border-garis bg-white p-4 font-medium text-tinta transition-colors hover:border-zaitun hover:bg-sage-muda/40";

export default async function HalamanAkun({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const [profil, { pesan }] = await Promise.all([getProfil(), searchParams]);
  if (!profil) redirect("/masuk?next=/akun");

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="judul text-5xl">Akun Saya</h1>
        <p className="mt-1 break-all text-sm text-abu">
          Masuk sebagai <span className="font-semibold text-tinta">{profil.email}</span>
          {profil.role === "admin" ? " · Admin" : null}
        </p>
        {pesan === "password-diubah" ? (
          <div className="mt-4">
            <Pesan ok="Password berhasil diubah." />
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <Kartu>
              <h2 className="mb-4 font-serif text-2xl font-bold italic">Profil</h2>
              <FormProfil nama={profil.nama} noTelp={profil.no_telp ?? ""} alamat={profil.alamat ?? ""} />
            </Kartu>
            <Kartu id="password" className="scroll-mt-28">
              <h2 className="font-serif text-2xl font-bold italic">Password</h2>
              <p className="mb-4 mt-1 text-sm text-abu">
                Daftar dengan Google? Buat password di sini supaya kamu juga bisa masuk dengan email dan password.
              </p>
              <FormUbahPassword />
            </Kartu>
          </div>

          <nav aria-label="Menu akun" className="space-y-3 md:sticky md:top-28 md:self-start">
            {profil.role === "admin" ? (
              <Link href="/admin" className={KELAS_MENU}>
                <LayoutDashboard size={18} className="text-rose" aria-hidden /> Admin Panel
              </Link>
            ) : null}
            <Link href="/pesanan" className={KELAS_MENU}>
              <Package size={18} className="text-rose" aria-hidden /> Pesanan Saya
            </Link>
            <form action={keluar}>
              <TombolKirim varian="bahaya" className="w-full py-3" teksProses="Keluar…">
                <LogOut size={16} aria-hidden /> Keluar
              </TombolKirim>
            </form>
          </nav>
        </div>
      </div>
    </div>
  );
}
