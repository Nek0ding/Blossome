"use client";

import { createContext, startTransition, useContext, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Tombol } from "./ui";

const KonteksPending = createContext<boolean | null>(null);

/**
 * Form untuk server action yang TIDAK mengosongkan isian setelah submit.
 * (React 19 otomatis me-reset form yang memakai `action={...}`, termasuk saat hasilnya error,
 * jadi isian pengguna hilang. Komponen ini mengirim lewat onSubmit supaya isian tetap ada.)
 */
export function FormAksi({
  aksi,
  pending,
  onSubmit,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action"> & {
  aksi: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <KonteksPending.Provider value={pending}>
      <form
        {...props}
        onSubmit={(e) => {
          onSubmit?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          if (pending) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const formData = new FormData(e.currentTarget, submitter);
          startTransition(() => aksi(formData));
        }}
      >
        {children}
      </form>
    </KonteksPending.Provider>
  );
}

/** Tombol submit yang otomatis nonaktif selama form diproses. */
export function TombolKirim({
  children,
  teksProses = "Memproses…",
  ...props
}: ComponentProps<typeof Tombol> & { teksProses?: string }) {
  const dariFormAksi = useContext(KonteksPending);
  const { pending: dariForm } = useFormStatus();
  const pending = dariFormAksi ?? dariForm;
  return (
    <Tombol type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? teksProses : children}
    </Tombol>
  );
}
