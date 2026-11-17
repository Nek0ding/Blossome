"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, LayoutDashboard, LogIn, LogOut, Menu, Package, ShoppingBag, UserRound, X } from "lucide-react";
import { keluar } from "@/lib/actions/auth";
import { kelasTombol } from "@/components/ui";
import { TombolKirim } from "@/components/form";

export interface PenggunaMenu {
  nama: string;
  email: string;
  admin: boolean;
  keranjang: number;
  notif: number;
}

const KELAS_TAUTAN = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-tinta hover:bg-sage-muda";

function Jumlah({ nilai }: { nilai: number }) {
  if (nilai <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-rose px-2 py-0.5 text-[11px] font-bold text-white">{nilai > 99 ? "99+" : nilai}</span>
  );
}

/** Menu HP/tablet: tautan halaman + status akun (sudah/belum masuk) + tombol keluar. */
export function MenuMobile({ tautan, pengguna }: { tautan: { href: string; label: string }[]; pengguna: PenggunaMenu | null }) {
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);
  const tutup = () => setBuka(false);

  // Tutup dengan Escape atau saat mengetuk di luar menu
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    const onLuar = (e: PointerEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onLuar);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onLuar);
    };
  }, [buka]);

  return (
    <div ref={wadah} className="lg:hidden">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls="menu-mobile"
        aria-label={buka ? "Tutup menu" : "Buka menu"}
        className="flex h-10 w-10 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda"
      >
        {buka ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>
      {buka ? (
        <>
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-garis bg-krem px-4 pb-4 pt-3 shadow-lg"
          >
            {/* Status akun */}
            {pengguna ? (
              <div className="mb-3 rounded-2xl border border-garis bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose text-base font-bold uppercase text-white">
                    {(pengguna.nama || pengguna.email || "?").trim().charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tinta">{pengguna.nama || "Akun saya"}</p>
                    <p className="truncate text-xs text-abu">{pengguna.email}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold text-zaitun-tua">
                    {pengguna.admin ? "Admin" : "Sudah masuk"}
                  </span>
                </div>
                <ul className="mt-2 space-y-0.5 border-t border-garis pt-2">
                  {pengguna.admin ? (
                    <li>
                      <Link href="/admin" onClick={tutup} className={KELAS_TAUTAN}>
                        <LayoutDashboard size={18} className="text-rose" aria-hidden /> Admin Panel
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link href="/akun" onClick={tutup} className={KELAS_TAUTAN}>
                      <UserRound size={18} className="text-rose" aria-hidden /> Akun Saya
                    </Link>
                  </li>
                  <li>
                    <Link href="/pesanan" onClick={tutup} className={KELAS_TAUTAN}>
                      <Package size={18} className="text-rose" aria-hidden /> Pesanan Saya
                    </Link>
                  </li>
                  <li>
                    <Link href="/keranjang" onClick={tutup} className={KELAS_TAUTAN}>
                      <ShoppingBag size={18} className="text-rose" aria-hidden /> Keranjang <Jumlah nilai={pengguna.keranjang} />
                    </Link>
                  </li>
                  <li>
                    <Link href="/notifikasi" onClick={tutup} className={KELAS_TAUTAN}>
                      <Bell size={18} className="text-rose" aria-hidden /> Notifikasi <Jumlah nilai={pengguna.notif} />
                    </Link>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="mb-3 rounded-2xl border border-garis bg-white p-3">
                <p className="text-sm text-abu">Kamu belum masuk.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href="/masuk" onClick={tutup} className={kelasTombol("utama", true, "w-full")}>
                    <LogIn size={16} aria-hidden /> Sign In
                  </Link>
                  <Link href="/daftar" onClick={tutup} className={kelasTombol("garis", true, "w-full")}>
                    Sign Up
                  </Link>
                </div>
              </div>
            )}

            <nav aria-label="Menu utama">
              <ul className="space-y-0.5">
                {tautan.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} onClick={tutup} className={KELAS_TAUTAN}>
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {pengguna ? (
              <form action={keluar} className="mt-3 border-t border-garis pt-3">
                <TombolKirim varian="bahaya" className="w-full" teksProses="Keluar…">
                  <LogOut size={16} aria-hidden /> Keluar
                </TombolKirim>
              </form>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
