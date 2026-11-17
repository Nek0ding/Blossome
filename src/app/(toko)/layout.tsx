import { PitaInfo } from "@/components/toko/pita-info";
import { Navbar } from "@/components/toko/navbar";
import { Footer } from "@/components/toko/footer";
import { getPengaturan } from "@/lib/toko";
import { arahkanAdminKeDashboard } from "@/lib/auth";

export default async function LayoutToko({ children }: { children: React.ReactNode }) {
  // Admin yang sedang masuk tidak boleh berada di halaman toko
  const [toko] = await Promise.all([getPengaturan(), arahkanAdminKeDashboard()]);
  return (
    <>
      <PitaInfo cutoff={toko.jam_cutoff} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer toko={toko} />
    </>
  );
}
