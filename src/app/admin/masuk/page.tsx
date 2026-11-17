import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormMasukAdmin } from "@/components/auth/form-auth";
import { getProfil } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In Admin", robots: { index: false, follow: false } };

export default async function HalamanMasukAdmin() {
  const profil = await getProfil();
  if (profil?.role === "admin") redirect("/admin");
  return (
    <KerangkaAuth judul="Sign In Admin" deskripsi="Masuk ke admin panel untuk mengelola pesanan, produk, dan toko.">
      <FormMasukAdmin />
    </KerangkaAuth>
  );
}
