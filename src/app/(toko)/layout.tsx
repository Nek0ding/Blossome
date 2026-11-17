import { PitaInfo } from "@/components/toko/pita-info";
import { Navbar } from "@/components/toko/navbar";
import { Footer } from "@/components/toko/footer";
import { getPengaturan } from "@/lib/toko";

export default async function LayoutToko({ children }: { children: React.ReactNode }) {
  const toko = await getPengaturan();
  return (
    <>
      <PitaInfo cutoff={toko.jam_cutoff} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer toko={toko} />
    </>
  );
}
