import type { Metadata } from "next";
import Link from "next/link";
import { JudulHalaman, Tabel, Td, Th } from "@/components/admin/ui-admin";
import { Kosong, kelasInput, kelasTombol } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { rupiah, tanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Pelanggan" };

const STATUS_DIBAYAR = ["diproses", "dikirim", "siap_diambil", "selesai"];

export default async function HalamanPelanggan({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qMentah } = await searchParams;
  const q = (qMentah ?? "").replace(/[^\w\s@.-]/g, "").trim().slice(0, 50);
  const supabase = await createClient();

  let query = supabase.from("profiles").select("id, nama, email, no_telp, created_at").eq("role", "customer").order("created_at", { ascending: false }).limit(500);
  if (q) query = query.or(`nama.ilike.%${q}%,email.ilike.%${q}%,no_telp.ilike.%${q}%`);
  const [{ data: pelanggan }, { data: pesanan }] = await Promise.all([
    query,
    supabase.from("pesanan").select("id_user, total_harga, status").in("status", STATUS_DIBAYAR),
  ]);

  const statistik = new Map<string, { jumlah: number; total: number }>();
  for (const p of pesanan ?? []) {
    if (!STATUS_DIBAYAR.includes(p.status)) continue;
    const s = statistik.get(p.id_user) ?? { jumlah: 0, total: 0 };
    s.jumlah += 1;
    s.total += Number(p.total_harga);
    statistik.set(p.id_user, s);
  }

  return (
    <>
      <JudulHalaman judul="Pelanggan" deskripsi="Akun customer yang terdaftar. Jumlah pesanan dan total belanja hanya menghitung pesanan yang sudah dibayar." />
      <form className="mb-4 flex gap-3 rounded-2xl border border-garis bg-white p-4" role="search">
        <label htmlFor="q" className="sr-only">Cari pelanggan</label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari nama, email, atau nomor telepon" className={kelasInput} />
        <button type="submit" className={kelasTombol("garis")}>
          Cari
        </button>
      </form>

      {(pelanggan ?? []).length === 0 ? (
        <Kosong judul="Belum ada pelanggan" />
      ) : (
        <Tabel>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Kontak</Th>
              <Th>Terdaftar</Th>
              <Th>Pesanan</Th>
              <Th>Total belanja</Th>
            </tr>
          </thead>
          <tbody>
            {(pelanggan ?? []).map((p) => {
              const s = statistik.get(p.id) ?? { jumlah: 0, total: 0 };
              return (
                <tr key={p.id} className="hover:bg-krem">
                  <Td>
                    <Link href={`/admin/pelanggan/${p.id}`} className="font-semibold text-rose hover:underline">
                      {p.nama || "(tanpa nama)"}
                    </Link>
                  </Td>
                  <Td>
                    <p>{p.email}</p>
                    {p.no_telp ? <p className="text-xs text-abu">{p.no_telp}</p> : null}
                  </Td>
                  <Td className="text-abu">{tanggal(p.created_at)}</Td>
                  <Td>{s.jumlah}</Td>
                  <Td className="font-semibold">{rupiah(s.total)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Tabel>
      )}
    </>
  );
}
