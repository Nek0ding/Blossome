"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  aturPasswordBaru,
  daftar,
  kirimUlangKode,
  lupaPassword,
  masuk,
  masukAdmin,
  masukGoogle,
  verifikasiOtp,
} from "@/lib/actions/auth";
import { Kolom, Pesan, kelasInput, kelasTombol } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";

function InputPassword({ id, name, autoComplete }: { id: string; name: string; autoComplete: string }) {
  const [tampil, setTampil] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={tampil ? "text" : "password"}
        required
        autoComplete={autoComplete}
        className={kelasInput + " pr-11"}
      />
      <button
        type="button"
        onClick={() => setTampil((v) => !v)}
        aria-label={tampil ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-abu hover:text-tinta"
      >
        {tampil ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}

function TombolGoogle({ next, label }: { next: string; label: string }) {
  return (
    <form action={masukGoogle}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className={kelasTombol("garis") + " w-full border-garis text-tinta"}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.800 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.500-1 7.300-2.700l-3.600-2.700c-1 .7-2.300 1.100-3.700 1.100-2.900 0-5.300-1.900-6.200-4.500H2.100v2.800A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.800 14.200a6.600 6.600 0 0 1 0-4.400V7H2.100a11 11 0 0 0 0 10z" />
          <path fill="#EA4335" d="M12 5.300c1.600 0 3.100.6 4.200 1.700l3.200-3.200A11 11 0 0 0 2.100 7l3.700 2.800c.9-2.600 3.300-4.500 6.200-4.500z" />
        </svg>
        {label}
      </button>
    </form>
  );
}

function Pemisah({ teks }: { teks: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-abu">
      <span className="h-px flex-1 bg-garis" />
      {teks}
      <span className="h-px flex-1 bg-garis" />
    </div>
  );
}

export function FormDaftar() {
  const [state, action, pending] = useActionState(daftar, null);
  return (
    <div className="space-y-4">
      <FormAksi aksi={action} pending={pending} className="space-y-4">
        <Kolom label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={kelasInput} />
        </Kolom>
        <Kolom label="Password" htmlFor="password" bantuan="Minimal 8 karakter, berisi huruf dan angka.">
          <InputPassword id="password" name="password" autoComplete="new-password" />
        </Kolom>
        <Kolom label="Konfirmasi Password" htmlFor="konfirmasi">
          <InputPassword id="konfirmasi" name="konfirmasi" autoComplete="new-password" />
        </Kolom>
        <Pesan error={state?.error} />
        <TombolKirim className="w-full">Sign Up</TombolKirim>
      </FormAksi>
      <Pemisah teks="Atau daftar dengan" />
      <TombolGoogle next="/" label="Sign up with Google" />
      <p className="text-center text-xs leading-relaxed text-abu">
        Dengan mendaftar, kamu menyetujui{" "}
        <Link href="/kebijakan-privasi" className="font-semibold text-rose hover:underline">
          Kebijakan Privasi
        </Link>{" "}
        kami.
      </p>
      <p className="text-center text-sm text-abu">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-rose hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export function FormMasuk({ next, galat }: { next: string; galat?: string }) {
  const [state, action, pending] = useActionState(masuk, null);
  return (
    <div className="space-y-4">
      <FormAksi aksi={action} pending={pending} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Kolom label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={kelasInput} />
        </Kolom>
        <Kolom label="Password" htmlFor="password">
          <InputPassword id="password" name="password" autoComplete="current-password" />
        </Kolom>
        <div className="text-right">
          <Link href="/lupa-password" className="text-sm font-medium text-rose hover:underline">
            Lupa password?
          </Link>
        </div>
        <Pesan error={state?.error ?? galat} />
        <TombolKirim className="w-full">Sign In</TombolKirim>
      </FormAksi>
      <Pemisah teks="Atau masuk dengan" />
      <TombolGoogle next={next} label="Sign in with Google" />
      <p className="text-center text-sm text-abu">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-rose hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

export function FormVerifikasi({ email, tipe }: { email: string; tipe: "daftar" | "reset" }) {
  const [state, action, pending] = useActionState(verifikasiOtp, null);
  const [stateUlang, actionUlang, pendingUlang] = useActionState(kirimUlangKode, null);
  return (
    <div className="space-y-4">
      <FormAksi aksi={action} pending={pending} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="tipe" value={tipe} />
        <Kolom label="Kode verifikasi" htmlFor="token" bantuan={`Kode dikirim ke ${email}.`}>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,8}"
            maxLength={8}
            required
            placeholder="••••••"
            className={kelasInput + " text-center text-2xl font-semibold tracking-[0.5em]"}
          />
        </Kolom>
        <Pesan error={state?.error} />
        <TombolKirim className="w-full">Verifikasi</TombolKirim>
      </FormAksi>
      <FormAksi aksi={actionUlang} pending={pendingUlang} className="space-y-3 text-center">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="tipe" value={tipe} />
        <Pesan error={stateUlang?.error} ok={stateUlang?.ok} />
        <p className="text-sm text-abu">
          Belum menerima kode?{" "}
          <TombolKirim varian="polos" kecil teksProses="Mengirim…" className="px-1.5 py-0.5 text-rose">
            Kirim ulang
          </TombolKirim>
        </p>
      </FormAksi>
    </div>
  );
}

export function FormLupaPassword() {
  const [state, action, pending] = useActionState(lupaPassword, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-4">
      <Kolom label="Email" htmlFor="email" bantuan="Kami kirim kode untuk mengatur ulang password.">
        <input id="email" name="email" type="email" required autoComplete="email" className={kelasInput} />
      </Kolom>
      <Pesan error={state?.error} />
      <TombolKirim className="w-full">Kirim Kode</TombolKirim>
      <p className="text-center text-sm text-abu">
        <Link href="/masuk" className="font-semibold text-rose hover:underline">
          Kembali ke Sign In
        </Link>
      </p>
    </FormAksi>
  );
}

export function FormPasswordBaru() {
  const [state, action, pending] = useActionState(aturPasswordBaru, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-4">
      <Kolom label="Password Baru" htmlFor="password" bantuan="Minimal 8 karakter, berisi huruf dan angka.">
        <InputPassword id="password" name="password" autoComplete="new-password" />
      </Kolom>
      <Kolom label="Konfirmasi Password Baru" htmlFor="konfirmasi">
        <InputPassword id="konfirmasi" name="konfirmasi" autoComplete="new-password" />
      </Kolom>
      <Pesan error={state?.error} />
      <TombolKirim className="w-full">Simpan Password</TombolKirim>
    </FormAksi>
  );
}

export function FormMasukAdmin() {
  const [state, action, pending] = useActionState(masukAdmin, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-4">
      <Kolom label="Email admin" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" className={kelasInput} />
      </Kolom>
      <Kolom label="Password" htmlFor="password">
        <InputPassword id="password" name="password" autoComplete="current-password" />
      </Kolom>
      <Pesan error={state?.error} />
      <TombolKirim className="w-full">Masuk ke Admin Panel</TombolKirim>
    </FormAksi>
  );
}
