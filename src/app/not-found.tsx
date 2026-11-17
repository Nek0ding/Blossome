import Link from "next/link";
import { Logo } from "@/components/logo";
import { kelasTombol } from "@/components/ui";

export default function TidakDitemukan() {
  return (
    <main className="motif-bunga flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo />
      <h1 className="judul mt-8 text-6xl">Halaman tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-abu">Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
      <Link href="/" className={kelasTombol("utama") + " mt-8"}>
        Kembali ke Beranda
      </Link>
    </main>
  );
}
