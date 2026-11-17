import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormMasukAdmin } from "@/components/auth/form-auth";
import { getProfil } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In Admin", robots: { index: false, follow: false } };

const GALAT: Record<string, string> = {
  google: "Masuk dengan Google gagal. Coba lagi.",
  "bukan-admin": "Akun ini bukan akun admin. Masuk dengan akun yang sudah dijadikan admin.",
};

export default async function HalamanMasukAdmin({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
  const [profil, sp] = await Promise.all([getProfil(), searchParams]);
  if (profil?.role === "admin") redirect("/admin");
  return (
    <KerangkaAuth judul="Sign In Admin" deskripsi="Masuk ke admin panel untuk mengelola pesanan, produk, dan toko.">
      <FormMasukAdmin galat={sp.galat ? GALAT[sp.galat] : undefined} />
    </KerangkaAuth>
  );
}
