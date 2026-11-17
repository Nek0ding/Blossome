import Link from "next/link";
import { Bell, ShoppingBag, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { kelasTombol } from "@/components/ui";
import { NotifRealtime } from "@/components/notif-realtime";
import { MenuMobile } from "./menu-mobile";
import { getProfil, getSesi } from "@/lib/auth";
import { getJumlahKeranjang, getJumlahNotifBaru } from "@/lib/data";

const TAUTAN = [
  { href: "/", label: "Home" },
  { href: "/katalog", label: "Our Catalog" },
  { href: "/#cara-pesan", label: "How To Order" },
  { href: "/#custom", label: "Custom Bouquet" },
  { href: "/#kontak", label: "Contact Us" },
];

function Angka({ nilai }: { nilai: number }) {
  if (nilai <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
      {nilai > 99 ? "99+" : nilai}
    </span>
  );
}

export async function Navbar() {
  // Sesi dibaca dari token (tanpa query), lalu profil dan dua hitungan diambil bersamaan.
  const sesi = await getSesi();
  const [profil, keranjang, notif] = sesi
    ? await Promise.all([getProfil(), getJumlahKeranjang(sesi.id), getJumlahNotifBaru(sesi.id)])
    : [null, 0, 0];

  return (
    <header className="sticky top-0 z-30 border-b border-garis/70 bg-krem/95 backdrop-blur">
      <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <MenuMobile tautan={TAUTAN} />
          <Logo />
        </div>

        <nav aria-label="Menu utama" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm font-medium text-zaitun-tua">
            {TAUTAN.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="hover:text-rose">
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {profil ? (
            <>
              {profil.role === "admin" ? (
                <Link href="/admin" className={kelasTombol("garis", true) + " hidden sm:inline-flex"}>
                  Admin Panel
                </Link>
              ) : null}
              <Link
                href="/notifikasi"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda"
                aria-label={notif > 0 ? `Notifikasi, ${notif} belum dibaca` : "Notifikasi"}
              >
                <Bell size={20} aria-hidden />
                <Angka nilai={notif} />
              </Link>
              <Link
                href="/keranjang"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda"
                aria-label={keranjang > 0 ? `Keranjang, ${keranjang} item` : "Keranjang"}
              >
                <ShoppingBag size={20} aria-hidden />
                <Angka nilai={keranjang} />
              </Link>
              <Link
                href="/akun"
                className="flex h-10 items-center gap-2 rounded-full px-2.5 text-sm font-medium text-zaitun-tua hover:bg-sage-muda"
              >
                <UserRound size={20} aria-hidden />
                <span className="hidden max-w-28 truncate md:inline">{profil.nama || "Akun"}</span>
              </Link>
              <NotifRealtime idUser={profil.id} />
            </>
          ) : (
            <>
              <Link href="/masuk" className="hidden px-3 text-sm font-semibold text-zaitun-tua hover:text-rose sm:inline">
                Sign In
              </Link>
              <Link href="/katalog" className={kelasTombol("utama", true) + " px-5 py-2"}>
                Order Now!
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
