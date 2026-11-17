import Image from "next/image";
import clsx from "clsx";

/** Foto produk. Kalau belum ada foto, tampilkan ilustrasi bunga sebagai pengganti. */
export function GambarProduk({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  prioritas = false,
  zoom = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  prioritas?: boolean;
  /** Perbesar foto sedikit saat kartu induk (class "group") di-hover. */
  zoom?: boolean;
}) {
  return (
    <div className={clsx("relative overflow-hidden bg-sage-muda", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={clsx("object-cover", zoom && "transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100")}
          priority={prioritas}
        />
      ) : (
        <div
          role="img"
          aria-label={`${alt} (foto belum tersedia)`}
          className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-pink-muda via-krem to-sage"
        >
          <svg viewBox="0 0 120 120" className="h-2/5 w-2/5 text-rose/50" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M60 46c0-14 20-18 22-4 12-4 20 12 8 20 10 8 0 24-12 18-2 14-22 14-24 0-12 6-22-10-12-18-12-8-4-24 8-20 2-14 22-10 22 4z" />
            <circle cx="60" cy="60" r="7" />
            <path d="M60 86v26M60 100c-8-8-18-6-22 0M60 104c8-8 18-6 22 0" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
