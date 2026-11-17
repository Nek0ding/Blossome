import { PitaInfo } from "@/components/toko/pita-info";
import { getPengaturan } from "@/lib/toko";

export default async function LayoutAuth({ children }: { children: React.ReactNode }) {
  const toko = await getPengaturan();
  return (
    <>
      <PitaInfo cutoff={toko.jam_cutoff} />
      {children}
    </>
  );
}
