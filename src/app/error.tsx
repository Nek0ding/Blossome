"use client";

import { useEffect } from "react";
import { Tombol } from "@/components/ui";

export default function GalatHalaman({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="judul text-5xl">Ada yang tidak beres</h1>
      <p className="mt-3 max-w-md text-abu">
        Halaman ini gagal dimuat. Coba lagi beberapa saat. Kalau masih gagal, hubungi admin toko.
      </p>
      <Tombol onClick={reset} className="mt-8">
        Coba Lagi
      </Tombol>
    </main>
  );
}
