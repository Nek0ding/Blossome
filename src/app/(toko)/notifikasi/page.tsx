import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Bell } from "lucide-react";
import { Kosong } from "@/components/ui";
import { TombolKirim } from "@/components/form";
import { tandaiSemuaDibaca } from "@/lib/actions/akun";
import { wajibLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tanggalJam } from "@/lib/format";
import type { Notifikasi } from "@/lib/types";

export const metadata: Metadata = { title: "Notifikasi" };

export default async function HalamanNotifikasi() {
  const sesi = await wajibLogin("/notifikasi");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifikasi")
    .select("id_notifikasi, id_pesanan, tipe, judul, pesan, is_dibaca, created_at, pesanan(kode_pesanan)")
    .eq("id_user", sesi.id)
    .eq("channel", "web")
    .order("created_at", { ascending: false })
    .limit(50);
  const daftar = (data ?? []) as unknown as Notifikasi[];
  const adaBaru = daftar.some((n) => !n.is_dibaca);

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="judul text-5xl">Notifikasi</h1>
          {adaBaru ? (
            <form action={tandaiSemuaDibaca}>
              <TombolKirim varian="garis" kecil teksProses="Menyimpan…">
                Tandai semua dibaca
              </TombolKirim>
            </form>
          ) : null}
        </div>

        {daftar.length === 0 ? (
          <div className="mt-8">
            <Kosong judul="Belum ada notifikasi">Kabar terbaru soal pesananmu akan muncul di sini.</Kosong>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {daftar.map((n) => {
              const isi = (
                <div
                  className={cn(
                    "flex gap-4 rounded-2xl border p-4",
                    n.is_dibaca ? "border-garis bg-white" : "border-pink bg-pink-muda",
                  )}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-rose">
                    <Bell size={18} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {n.judul}
                      {!n.is_dibaca ? <span className="sr-only"> (belum dibaca)</span> : null}
                    </p>
                    <p className="text-sm text-abu">{n.pesan}</p>
                    <p className="mt-1 text-xs text-abu">{tanggalJam(n.created_at)}</p>
                  </div>
                </div>
              );
              return (
                <li key={n.id_notifikasi}>
                  {n.pesanan?.kode_pesanan ? (
                    <Link href={`/pesanan/${n.pesanan.kode_pesanan}`} className="block hover:opacity-90">
                      {isi}
                    </Link>
                  ) : (
                    isi
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
