import type { Metadata } from "next";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormLupaPassword } from "@/components/auth/form-auth";

export const metadata: Metadata = { title: "Reset Password" };

export default function HalamanLupaPassword() {
  return (
    <KerangkaAuth judul="Reset Password" deskripsi="Masukkan email akunmu untuk menerima kode reset password.">
      <FormLupaPassword />
    </KerangkaAuth>
  );
}
