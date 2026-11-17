import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

/** Tata letak halaman auth sesuai mockup: panel foto di kiri, form di kanan. */
export function KerangkaAuth({
  judul,
  deskripsi,
  children,
}: {
  judul: string;
  deskripsi: string;
  children: ReactNode;
}) {
  return (
    <main className="motif-bunga flex flex-1 items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-stretch">
        <aside className="hidden rounded-3xl bg-pink-muda p-5 lg:flex lg:flex-col">
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-linear-to-br from-pink via-pink-muda to-sage">
            <svg viewBox="0 0 200 200" className="absolute inset-0 m-auto h-3/5 w-3/5 text-rose/40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M100 78c0-24 34-30 38-6 20-8 34 20 14 34 16 14 0 40-20 30-4 24-38 24-42 0-20 10-36-16-20-30-20-14-6-42 14-34 4-24 38-18 38 6z" />
              <circle cx="100" cy="100" r="12" />
              <path d="M100 144v46M100 168c-14-14-30-10-38 0M100 176c14-14 30-10 38 0" strokeLinecap="round" />
            </svg>
          </div>
          <div className="px-2 pt-5">
            <p className="font-serif text-2xl font-bold italic text-zaitun-tua">Made with love, just for you.</p>
            <p className="mt-1 text-sm text-abu">
              Setiap buket dirangkai dengan hati supaya momen spesialmu makin berkesan.
            </p>
          </div>
        </aside>

        <section className="rounded-3xl border border-garis bg-white p-6 sm:p-10">
          <div className="mb-8 flex items-center justify-between">
            <Logo />
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
              <ArrowLeft size={16} aria-hidden /> Back Home
            </Link>
          </div>
          <h1 className="judul text-4xl">{judul}</h1>
          <p className="mb-6 mt-2 text-sm text-abu">{deskripsi}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
