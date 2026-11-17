"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  ExternalLink,
  Flower2,
  Gift,
  LayoutDashboard,
  Menu,
  Settings,
  Tags,
  Users,
  X,
} from "lucide-react";

const MENU = [
  { href: "/admin", label: "Dashboard", ikon: LayoutDashboard, persis: true },
  { href: "/admin/pesanan", label: "Pesanan", ikon: ClipboardList, lencana: "pesanan" as const },
  { href: "/admin/produk", label: "Produk", ikon: Flower2 },
  { href: "/admin/kategori", label: "Kategori", ikon: Tags },
  { href: "/admin/addon", label: "Addon", ikon: Gift },
  { href: "/admin/stok", label: "Inventaris & Stok", ikon: Boxes },
  { href: "/admin/pelanggan", label: "Pelanggan", ikon: Users },
  { href: "/admin/laporan", label: "Laporan", ikon: BarChart3 },
  { href: "/admin/pengaturan", label: "Pengaturan Toko", ikon: Settings },
];

function Isi({ pesananBaru, onPilih }: { pesananBaru: number; onPilih?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu admin">
      <ul className="space-y-1">
        {MENU.map(({ href, label, ikon: Ikon, persis, lencana }) => {
          const aktif = persis ? path === href : path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onPilih}
                aria-current={aktif ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  aktif ? "bg-krem text-zaitun-tua" : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                <Ikon size={18} aria-hidden />
                <span className="flex-1">{label}</span>
                {lencana === "pesanan" && pesananBaru > 0 ? (
                  <span className="rounded-full bg-rose px-2 py-0.5 text-[11px] font-bold text-white">
                    {pesananBaru}
                    <span className="sr-only"> pesanan perlu diproses</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Sidebar tetap untuk layar besar. */
export function SidebarAdmin({ pesananBaru, slotKeluar }: { pesananBaru: number; slotKeluar: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-zaitun-tua p-4 text-white lg:flex">
      <div className="px-2 pb-6 pt-2">
        <p className="font-script text-4xl leading-none">Blossomé</p>
        <p className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
          Admin Panel
        </p>
      </div>
      <Isi pesananBaru={pesananBaru} />
      <div className="mt-auto border-t border-white/15 pt-4">{slotKeluar}</div>
    </aside>
  );
}

/** Tombol menu + laci navigasi untuk layar kecil. */
export function MenuAdminMobile({ pesananBaru, slotKeluar }: { pesananBaru: number; slotKeluar: React.ReactNode }) {
  const [buka, setBuka] = useState(false);

  // Tutup dengan tombol Escape dan kunci scroll halaman selama laci terbuka
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowLama;
      window.removeEventListener("keydown", onKey);
    };
  }, [buka]);
  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setBuka(true)}
          aria-expanded={buka}
          aria-label="Buka menu admin"
          className="flex h-10 w-10 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda"
        >
          <Menu size={22} aria-hidden />
        </button>
        {buka
          ? createPortal(
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu admin">
            <div className="w-72 overflow-y-auto bg-zaitun-tua p-4 text-white">
              <div className="mb-6 flex items-center justify-between px-2">
                <p className="font-script text-4xl leading-none">Blossomé</p>
                <button
                  type="button"
                  onClick={() => setBuka(false)}
                  aria-label="Tutup menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              <Isi pesananBaru={pesananBaru} onPilih={() => setBuka(false)} />
              <div className="mt-6 space-y-1 border-t border-white/15 pt-4">
                <Link
                  href="/"
                  onClick={() => setBuka(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink size={18} aria-hidden /> Lihat toko
                </Link>
                {slotKeluar}
              </div>
            </div>
            <button type="button" className="flex-1 bg-black/40" aria-label="Tutup menu" onClick={() => setBuka(false)} />
          </div>,
              // Dirender langsung di <body>: header memakai backdrop-blur, yang membuat elemen "fixed"
              // di dalamnya terkurung setinggi header (laci jadi tidak terlihat).
              document.body,
            )
          : null}
      </div>
    </>
  );
}
