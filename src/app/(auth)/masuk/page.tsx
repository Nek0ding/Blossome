import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormMasuk } from "@/components/auth/form-auth";
import { amankanNext, getProfil, getSesi } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In" };

const GALAT: Record<string, string> = {
  google: "Login dengan Google gagal. Coba lagi.",
  tautan: "Tautan sudah tidak berlaku. Minta kode atau tautan baru.",
};

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; galat?: string }>;
}) {
  const sp = await searchParams;
  const next = amankanNext(sp.next);
  if (await getSesi()) redirect((await getProfil())?.role === "admin" ? "/admin" : next);
  return (
    <KerangkaAuth judul="Sign In" deskripsi="Selamat datang kembali. Masuk untuk melanjutkan pesananmu.">
      <FormMasuk next={next} galat={sp.galat ? GALAT[sp.galat] : undefined} />
    </KerangkaAuth>
  );
}
