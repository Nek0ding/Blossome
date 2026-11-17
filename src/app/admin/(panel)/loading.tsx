import { KerangkaBaris } from "@/components/kerangka";

export default function MemuatAdmin() {
  return (
    <div role="status" aria-label="Memuat">
      <div className="mb-6 h-10 w-56 animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
      <KerangkaBaris />
    </div>
  );
}
