import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark toko. Ganti dengan file logo di /public kalau sudah ada. */
export function Logo({ href = "/", terang = false, className }: { href?: string; terang?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex shrink-0 flex-col whitespace-nowrap leading-none", className)} aria-label="Blossomé, ke beranda">
      <span className={cn("font-script text-4xl", terang ? "text-white" : "text-rose")}>Blossomé</span>
      <span
        className={cn(
          "-mt-1 pl-1 text-[9px] font-semibold uppercase tracking-[0.25em]",
          terang ? "text-white/80" : "text-zaitun-tua",
        )}
      >
        Florist &amp; Bouquet
      </span>
    </Link>
  );
}
