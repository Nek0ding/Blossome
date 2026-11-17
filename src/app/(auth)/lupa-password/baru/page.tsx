import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormPasswordBaru } from "@/components/auth/form-auth";
import { getSesi } from "@/lib/auth";

export const metadata: Metadata = { title: "Set New Password" };

export default async function HalamanPasswordBaru() {
  // Halaman ini dibuka setelah kode reset diverifikasi, jadi sesi sudah ada.
  if (!(await getSesi())) redirect("/lupa-password");
  return (
    <KerangkaAuth judul="Set New Password" deskripsi="Masukkan password baru untuk menyelesaikan proses reset.">
      <FormPasswordBaru />
    </KerangkaAuth>
  );
}
