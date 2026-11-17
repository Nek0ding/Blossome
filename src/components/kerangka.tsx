/** Kerangka (skeleton) saat halaman sedang dimuat. */
export function KerangkaKartu({ jumlah = 6 }: { jumlah?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-garis bg-white">
          <div className="aspect-4/5 w-full animate-pulse bg-sage-muda motion-reduce:animate-none" />
          <div className="space-y-2 p-3 sm:p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-krem-tua motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-krem-tua motion-reduce:animate-none" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-krem-tua motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KerangkaBaris({ jumlah = 5 }: { jumlah?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
      ))}
    </div>
  );
}
