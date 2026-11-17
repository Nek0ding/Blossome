import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JudulHalaman, Tabel, Td, Th } from "@/components/admin/ui-admin";
import { Kartu, Kosong, LencanaStatus } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import type { Pesanan, Profil } from "@/lib/types";

export const metadata: Metadata = { title: "Detail Pelanggan" };

export default async function DetailPelanggan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: profil }, { data: pesanan }] = await Promise.all([
    supabase.from("profiles").select("id, nama, email, no_telp, alamat, role, created_at").eq("id", id).maybeSingle(),
    supabase.from("pesanan").select("*").eq("id_user", id).order("created_at", { ascending: false }),
  ]);
  if (!profil) notFound();
  const p = profil as Profil;
  const daftar = (pesanan ?? []) as Pesanan[];
  const dibayar = daftar.filter((x) => ["diproses", "dikirim", "siap_diambil", "selesai"].includes(x.status));

  return (
    <>
      <Link href="/admin/pelanggan" className="inline-flex items-center gap-1.5 text-sm font-medium text-zaitun-tua hover:underline">
        <ArrowLeft size={16} aria-hidden /> Semua pelanggan
      </Link>
      <div className="mt-3">
        <JudulHalaman judul={p.nama || "(tanpa nama)"} deskripsi={`Terdaftar ${tanggal(p.created_at)}`} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Kartu className="space-y-1 text-sm">
          <p className="text-abu">Kontak</p>
          <p className="font-medium">{p.email}</p>
          <p>{p.no_telp ?? "-"}</p>
          {p.alamat ? <p className="whitespace-pre-line text-abu">{p.alamat}</p> : null}
        </Kartu>
        <Kartu>
          <p className="text-sm text-abu">Pesanan dibayar</p>
          <p className="mt-1 text-2xl font-bold">{dibayar.length}</p>
        </Kartu>
        <Kartu>
          <p className="text-sm text-abu">Total belanja</p>
          <p className="mt-1 text-2xl font-bold">{rupiah(dibayar.reduce((n, x) => n + Number(x.total_harga), 0))}</p>
        </Kartu>
      </div>

      {daftar.length === 0 ? (
        <Kosong judul="Belum ada pesanan" />
      ) : (
        <Tabel>
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Dibuat</Th>
              <Th>Total</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((x) => (
              <tr key={x.id_pesanan}>
                <Td>
                  <Link href={`/admin/pesanan/${x.kode_pesanan}`} className="font-semibold text-rose hover:underline">
                    {x.kode_pesanan}
                  </Link>
                </Td>
                <Td className="text-abu">{tanggalJam(x.created_at)}</Td>
                <Td>{rupiah(x.total_harga)}</Td>
                <Td>
                  <LencanaStatus status={x.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      )}
    </>
  );
}
