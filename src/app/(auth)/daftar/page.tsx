import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KerangkaAuth } from "@/components/auth/kerangka-auth";
import { FormDaftar } from "@/components/auth/form-auth";
import { getSesi } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign Up" };

export default async function HalamanDaftar() {
  if (await getSesi()) redirect("/");
  return (
    <KerangkaAuth
      judul="Sign Up"
      deskripsi="Buat akun untuk memesan buket dan memantau pesananmu. Momen spesialmu berikutnya dimulai di sini."
    >
      <FormDaftar />
    </KerangkaAuth>
  );
}
