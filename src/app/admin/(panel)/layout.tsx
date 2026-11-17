import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CircleUserRound, LogOut } from "lucide-react";
import { MenuAdminMobile, SidebarAdmin } from "@/components/admin/sidebar";
import { NotifRealtime } from "@/components/notif-realtime";
import { TombolKirim } from "@/components/form";
import { keluarAdmin } from "@/lib/actions/auth";
import { wajibAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin Blossomé" },
  robots: { index: false, follow: false },
};

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const profil = await wajibAdmin();
  const supabase = await createClient();
  const [{ count: diproses }, { count: notifBaru }] = await Promise.all([
    supabase.from("pesanan").select("id_pesanan", { count: "exact", head: true }).eq("status", "diproses"),
    supabase
      .from("notifikasi")
      .select("id_notifikasi", { count: "exact", head: true })
      .eq("id_user", profil.id)
      .eq("channel", "web")
      .eq("is_dibaca", false),
  ]);

  const tombolKeluar = (
    <form action={keluarAdmin}>
      <TombolKirim varian="polos" className="w-full justify-start px-3 text-white/85 hover:bg-white/10 hover:text-white" teksProses="Keluar…">
        <LogOut size={18} aria-hidden /> Keluar
      </TombolKirim>
    </form>
  );

  return (
    <div className="flex min-h-screen bg-krem">
      <NotifRealtime idUser={profil.id} />
      <SidebarAdmin pesananBaru={diproses ?? 0} slotKeluar={tombolKeluar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-garis bg-krem/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <MenuAdminMobile pesananBaru={diproses ?? 0} slotKeluar={tombolKeluar} />
            <p className="text-sm text-abu">
              Selamat datang kembali, <span className="font-semibold text-tinta">{profil.nama || "Admin"}</span>!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/akun"
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zaitun-tua hover:bg-sage-muda sm:inline-flex"
            >
              <CircleUserRound size={16} aria-hidden /> Akun Saya
            </Link>
            <Link
              href="/admin/notifikasi"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda"
              aria-label={notifBaru ? `Notifikasi, ${notifBaru} belum dibaca` : "Notifikasi"}
            >
              <Bell size={20} aria-hidden />
              {notifBaru ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                  {notifBaru > 99 ? "99+" : notifBaru}
                </span>
              ) : null}
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
