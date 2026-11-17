import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { JudulHalaman, Tabel, Td, Th } from "@/components/admin/ui-admin";
import { FormStok } from "@/components/admin/form-stok";
import { createClient } from "@/lib/supabase/server";
import { labelLogStok, tanggalJam } from "@/lib/format";
import type { LogStok } from "@/lib/types";

export const metadata: Metadata = { title: "Inventaris & Stok" };

type Item = { id: number; nama: string; stok: number; stok_minimum: number; is_aktif: boolean };

function TabelStok({ judul, jenis, items }: { judul: string; jenis: "produk" | "addon"; items: Item[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-serif text-2xl font-bold">{judul}</h2>
      <Tabel>
        <thead>
          <tr>
            <Th>Nama</Th>
            <Th>Stok</Th>
            <Th>Minimum</Th>
            <Th>Ubah stok</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className={cn(!i.is_aktif && "opacity-60")}>
              <Td>
                <p className="font-semibold">{i.nama}</p>
                {!i.is_aktif ? <p className="text-xs text-abu">Nonaktif</p> : null}
              </Td>
              <Td>
                <span
                  className={cn(
                    "inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-xs font-bold",
                    i.stok <= i.stok_minimum ? "bg-amber-100 text-amber-800" : "bg-sage text-zaitun-tua",
                  )}
                >
                  {i.stok}
                </span>
              </Td>
              <Td>{i.stok_minimum}</Td>
              <Td>
                <FormStok jenis={jenis} id={i.id} nama={i.nama} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabel>
    </section>
  );
}

export default async function HalamanStok({ searchParams }: { searchParams: Promise<{ log?: string }> }) {
  const { log } = await searchParams;
  const filterLog = log === "produk" || log === "addon" ? log : undefined;
  const supabase = await createClient();

  let queryLog = supabase
    .from("log_stok")
    .select("id_log, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan, created_at, produk(nama_produk), addon(nama_addon)")
    .order("created_at", { ascending: false })
    .order("id_log", { ascending: false })
    .limit(100);
  if (filterLog === "produk") queryLog = queryLog.not("id_produk", "is", null);
  if (filterLog === "addon") queryLog = queryLog.not("id_addon", "is", null);

  const [{ data: produk }, { data: addon }, { data: logData }] = await Promise.all([
    supabase.from("produk").select("id_produk, nama_produk, stok, stok_minimum, is_aktif").order("is_aktif", { ascending: false }).order("nama_produk"),
    supabase.from("addon").select("id_addon, nama_addon, stok, stok_minimum, is_aktif").order("is_aktif", { ascending: false }).order("nama_addon"),
    queryLog,
  ]);
  const logs = (logData ?? []) as unknown as LogStok[];

  return (
    <>
      <JudulHalaman
        judul="Inventaris & Stok"
        deskripsi="Stok otomatis berkurang saat pesanan dibuat dan kembali saat pesanan dibatalkan. Semua perubahan tercatat di log."
      />
      <TabelStok
        judul="Produk"
        jenis="produk"
        items={(produk ?? []).map((p) => ({ id: p.id_produk, nama: p.nama_produk, stok: p.stok, stok_minimum: p.stok_minimum, is_aktif: p.is_aktif }))}
      />
      <TabelStok
        judul="Addon"
        jenis="addon"
        items={(addon ?? []).map((a) => ({ id: a.id_addon, nama: a.nama_addon, stok: a.stok, stok_minimum: a.stok_minimum, is_aktif: a.is_aktif }))}
      />

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-bold">Log Stok (100 terakhir)</h2>
          <nav aria-label="Filter log" className="flex gap-2 text-sm">
            {[
              { v: undefined, l: "Semua" },
              { v: "produk", l: "Produk" },
              { v: "addon", l: "Addon" },
            ].map((f) => (
              <Link
                key={f.l}
                href={f.v ? `/admin/stok?log=${f.v}` : "/admin/stok"}
                aria-current={filterLog === f.v ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 font-medium",
                  filterLog === f.v ? "bg-zaitun text-white" : "border border-garis bg-white text-zaitun-tua",
                )}
              >
                {f.l}
              </Link>
            ))}
          </nav>
        </div>
        <Tabel>
          <thead>
            <tr>
              <Th>Waktu</Th>
              <Th>Item</Th>
              <Th>Tipe</Th>
              <Th>Jumlah</Th>
              <Th>Stok</Th>
              <Th>Keterangan</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id_log}>
                <Td className="whitespace-nowrap text-xs text-abu">{tanggalJam(l.created_at)}</Td>
                <Td>{l.produk?.nama_produk ?? l.addon?.nama_addon ?? "-"}</Td>
                <Td>{labelLogStok(l.tipe)}</Td>
                <Td className={l.tipe === "keluar" || l.tipe === "penyesuaian" ? "text-red-700" : "text-emerald-700"}>
                  {l.tipe === "keluar" || l.tipe === "penyesuaian" ? "−" : "+"}
                  {l.jumlah}
                </Td>
                <Td className="whitespace-nowrap">
                  {l.stok_sebelum} → {l.stok_sesudah}
                </Td>
                <Td className="text-abu">{l.keterangan ?? "-"}</Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </section>
    </>
  );
}
