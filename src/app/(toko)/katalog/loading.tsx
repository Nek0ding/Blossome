import { KerangkaKartu } from "@/components/kerangka";

export default function MemuatKatalog() {
  return (
    <div className="px-4 py-12 sm:px-6" role="status" aria-label="Memuat katalog">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto h-16 w-72 animate-pulse rounded-xl bg-krem-tua motion-reduce:animate-none" />
        <div className="mx-auto mt-8 h-9 w-full max-w-xl animate-pulse rounded-full bg-krem-tua motion-reduce:animate-none" />
        <div className="mt-10">
          <KerangkaKartu />
        </div>
      </div>
    </div>
  );
}
