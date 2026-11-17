import Link from "next/link";
import { Logo } from "@/components/logo";
import type { PengaturanToko } from "@/lib/types";

export function Footer({ toko }: { toko: PengaturanToko }) {
  const tahun = new Date().getFullYear();
  return (
    <footer className="border-t border-garis bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-rose">
            {toko.deskripsi ??
              "Florist butik di Depok yang merangkai buket bunga segar, rangkaian wisuda, dan hadiah bunga custom untuk momen spesialmu."}
          </p>
        </div>
        <nav aria-label="Tautan footer" className="grid grid-cols-2 gap-2 text-sm text-rose sm:justify-self-end">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/#tentang" className="hover:underline">About Us</Link>
          <Link href="/katalog" className="hover:underline">Our Catalog</Link>
          <Link href="/#faq" className="hover:underline">FAQs</Link>
          <Link href="/#custom" className="hover:underline">Custom Bouquet</Link>
          <Link href="/#kontak" className="hover:underline">Contact Us</Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-garis px-4 py-5 text-xs font-medium text-zaitun-tua sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {tahun} {toko.nama_toko} Bouquet &amp; Florist Depok. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/kebijakan-privasi" className="hover:underline">
            Kebijakan Privasi
          </Link>
          <p>Pembayaran aman dengan QRIS</p>
        </div>
      </div>
    </footer>
  );
}
