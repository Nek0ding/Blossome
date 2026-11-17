import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Bell } from "lucide-react";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { Kosong } from "@/components/ui";
import { TombolKirim } from "@/components/form";
import { tandaiNotifAdminDibaca } from "@/lib/actions/admin";
import { wajibAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tanggalJam } from "@/lib/format";
import type { Notifikasi } from "@/lib/types";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function NotifikasiAdmin() {
  const profil = await wajibAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifikasi")
    .select("id_notifikasi, id_pesanan, tipe, judul, pesan, is_dibaca, created_at, pesanan(kode_pesanan)")
    .eq("id_user", profil.id)
    .eq("channel", "web")
    .order("created_at", { ascending: false })
    .limit(100);
  const daftar = (data ?? []) as unknown as Notifikasi[];

  return (
    <>
      <JudulHalaman
        judul="Notifikasi"
        deskripsi="Orderan masuk muncul di sini setelah pembayaran QRIS lunas."
        aksi={
          daftar.some((n) => !n.is_dibaca) ? (
            <form action={tandaiNotifAdminDibaca}>
              <TombolKirim varian="garis" kecil teksProses="Menyimpan…">
                Tandai semua dibaca
              </TombolKirim>
            </form>
          ) : null
        }
      />
      {daftar.length === 0 ? (
        <Kosong judul="Belum ada notifikasi" />
      ) : (
        <ul className="space-y-3">
          {daftar.map((n) => (
            <li key={n.id_notifikasi}>
              <Link
                href={n.pesanan?.kode_pesanan ? `/admin/pesanan/${n.pesanan.kode_pesanan}` : "/admin/pesanan"}
                className={cn("flex gap-4 rounded-2xl border p-4 hover:opacity-90", n.is_dibaca ? "border-garis bg-white" : "border-pink bg-pink-muda")}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-rose">
                  <Bell size={18} aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">
                    {n.judul}
                    {!n.is_dibaca ? <span className="sr-only"> (belum dibaca)</span> : null}
                  </p>
                  <p className="text-sm text-abu">{n.pesan}</p>
                  <p className="mt-1 text-xs text-abu">{tanggalJam(n.created_at)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
