import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormVerifikasi } from "@/components/auth/form-auth";

export const metadata: Metadata = { title: "OTP Verification" };

export default async function HalamanVerifikasi({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; tipe?: string }>;
}) {
  const sp = await searchParams;
  const email = (sp.email ?? "").trim();
  if (!email) redirect("/masuk");
  const tipe = sp.tipe === "reset" ? "reset" : "daftar";
  return (
    <KerangkaAuth judul="OTP Verification" deskripsi="Cek email kamu untuk melihat kode verifikasi.">
      <FormVerifikasi email={email} tipe={tipe} />
    </KerangkaAuth>
  );
}
