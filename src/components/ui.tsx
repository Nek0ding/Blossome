import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";
import type { StatusPesanan } from "@/lib/types";
import { labelStatus, warnaStatus } from "@/lib/format";

type Varian = "utama" | "rose" | "garis" | "bahaya" | "polos";

const KELAS_TOMBOL: Record<Varian, string> = {
  utama: "tombol-gradasi text-white shadow-sm",
  rose: "bg-rose text-white hover:bg-rose-tua",
  garis: "border border-zaitun text-zaitun-tua bg-white hover:bg-sage-muda",
  bahaya: "border border-red-300 text-red-700 bg-white hover:bg-red-50",
  polos: "text-zaitun-tua hover:bg-sage-muda",
};

export function kelasTombol(varian: Varian = "utama", kecil = false, tambahan?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    kecil ? "px-3.5 py-1.5 text-sm" : "px-6 py-2.5 text-sm",
    KELAS_TOMBOL[varian],
    tambahan,
  );
}

export function Tombol({
  varian = "utama",
  kecil = false,
  className,
  ...props
}: ComponentProps<"button"> & { varian?: Varian; kecil?: boolean }) {
  return <button {...props} className={cn(kelasTombol(varian, kecil), className)} />;
}

export const kelasInput =
  "w-full rounded-xl border border-garis bg-white px-3.5 py-2.5 text-sm text-tinta placeholder:text-abu/70 focus:border-zaitun focus:outline-none focus:ring-2 focus:ring-zaitun/20 disabled:bg-krem-tua";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label {...props} className={cn("mb-1.5 block text-sm font-semibold text-tinta", className)} />;
}

/** Label + input + teks bantuan dalam satu blok. */
export function Kolom({
  label,
  htmlFor,
  bantuan,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  bantuan?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {bantuan ? <p className="mt-1.5 text-xs text-abu">{bantuan}</p> : null}
    </div>
  );
}

export function Kartu({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("rounded-2xl border border-garis bg-white p-5 sm:p-6", className)} />;
}

export function LencanaStatus({ status }: { status: StatusPesanan }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", warnaStatus(status))}>
      {labelStatus(status)}
    </span>
  );
}

export function Lencana({ children, warna = "bg-sage text-zaitun-tua" }: { children: ReactNode; warna?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", warna)}>{children}</span>;
}

/** Kotak pesan error atau sukses dari server action. */
export function Pesan({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-sm",
        error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {error ?? ok}
    </p>
  );
}

export function Kosong({ judul, children }: { judul: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-garis bg-white/60 px-6 py-12 text-center">
      <p className="font-serif text-2xl font-semibold text-tinta">{judul}</p>
      {children ? <div className="mt-2 text-sm text-abu">{children}</div> : null}
    </div>
  );
}
