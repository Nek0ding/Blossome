"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const jam = Math.floor(total / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;
  const dua = (n: number) => String(n).padStart(2, "0");
  return jam > 0 ? `${jam}:${dua(menit)}:${dua(detik)}` : `${dua(menit)}:${dua(detik)}`;
}

/** Hitung mundur batas bayar. Saat habis, halaman dimuat ulang supaya status terbaru tampil. */
export function HitungMundur({ sampai }: { sampai: string }) {
  const router = useRouter();
  const target = new Date(sampai).getTime();
  const [sisa, setSisa] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSisa(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (sisa !== null && sisa <= 0) {
      const id = window.setTimeout(() => router.refresh(), 4000);
      return () => window.clearTimeout(id);
    }
  }, [sisa, router]);

  if (sisa === null) return <span className="tabular-nums">--:--</span>;
  return (
    <span className="tabular-nums" role="timer" aria-live="off">
      {sisa > 0 ? format(sisa) : "Waktu habis"}
    </span>
  );
}
