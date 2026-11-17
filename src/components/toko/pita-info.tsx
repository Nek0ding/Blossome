/** Pita pengumuman di paling atas, sesuai mockup. */
export function PitaInfo({ cutoff }: { cutoff: string }) {
  const jam = cutoff.slice(0, 5);
  return (
    <div className="bg-zaitun px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white sm:text-xs">
      <span aria-hidden="true">🌸 </span>
      Same-day delivery untuk Jakarta &amp; sekitarnya | Pesan sebelum jam {jam} WIB
      <span aria-hidden="true"> 🌸</span>
    </div>
  );
}
