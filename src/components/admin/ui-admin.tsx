import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";

export function JudulHalaman({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl font-bold text-tinta">{judul}</h1>
        {deskripsi ? <p className="mt-1 text-sm text-abu">{deskripsi}</p> : null}
      </div>
      {aksi ? <div className="flex flex-wrap gap-2">{aksi}</div> : null}
    </div>
  );
}

export function Tabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("overflow-x-auto rounded-2xl border border-garis bg-white", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={clsx("border-b border-garis bg-krem-tua px-4 py-3 text-xs font-semibold uppercase tracking-wide text-abu", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={clsx("border-b border-garis/70 px-4 py-3 align-top", className)}>{children}</td>;
}

export function KartuStat({
  label,
  nilai,
  keterangan,
  href,
  warna = "bg-sage-muda",
}: {
  label: string;
  nilai: ReactNode;
  keterangan?: ReactNode;
  href?: string;
  warna?: string;
}) {
  const isi = (
    <div className={clsx("h-full rounded-2xl p-5", warna)}>
      <p className="text-sm font-medium text-abu">{label}</p>
      <p className="mt-2 text-2xl font-bold text-tinta">{nilai}</p>
      {keterangan ? <p className="mt-1 text-xs text-abu">{keterangan}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-90">
      {isi}
    </Link>
  ) : (
    isi
  );
}

/** Navigasi halaman sebelumnya/berikutnya dengan query string yang sama. */
export function Paginasi({
  halaman,
  adaBerikutnya,
  buatHref,
}: {
  halaman: number;
  adaBerikutnya: boolean;
  buatHref: (h: number) => string;
}) {
  if (halaman <= 1 && !adaBerikutnya) return null;
  const kelas = "rounded-full border border-garis bg-white px-4 py-1.5 text-sm font-medium text-zaitun-tua hover:border-zaitun";
  return (
    <nav aria-label="Halaman" className="mt-4 flex items-center justify-between">
      {halaman > 1 ? (
        <Link href={buatHref(halaman - 1)} className={kelas}>
          Sebelumnya
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-abu">Halaman {halaman}</span>
      {adaBerikutnya ? (
        <Link href={buatHref(halaman + 1)} className={kelas}>
          Berikutnya
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
