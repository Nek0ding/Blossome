"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MenuMobile({ tautan }: { tautan: { href: string; label: string }[] }) {
  const [buka, setBuka] = useState(false);
  return (
    <div className="lg:hidden">
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
        <nav
          id="menu-mobile"
          className="absolute inset-x-0 top-full z-40 border-b border-garis bg-krem px-4 py-3 shadow-sm"
          aria-label="Menu utama"
        >
          <ul className="space-y-1">
            {tautan.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  onClick={() => setBuka(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-tinta hover:bg-sage-muda"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
