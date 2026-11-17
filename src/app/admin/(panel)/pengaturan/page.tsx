import type { Metadata } from "next";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { FormOperasional, FormProfilToko, FormTemplateEmail } from "@/components/admin/form-pengaturan";
import { FormZona } from "@/components/admin/form-master";
import { TombolSalin } from "@/components/pesanan/aksi-customer";
import { Kartu } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getOrigin, getPengaturan } from "@/lib/toko";
import { midtransProduksi } from "@/lib/midtrans";
import type { Zona } from "@/lib/types";

export const metadata: Metadata = { title: "Pengaturan Toko" };

function Cek({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 size={16} className="text-emerald-600" aria-hidden /> : <AlertCircle size={16} className="text-amber-600" aria-hidden />}
      <span>
        {label}: <span className="font-semibold">{ok ? "sudah diisi" : "belum diisi"}</span>
      </span>
    </li>
  );
}

export default async function HalamanPengaturan() {
  const supabase = await createClient();
  const [toko, origin, { data: zona }] = await Promise.all([
    getPengaturan(),
    getOrigin(),
    supabase.from("zona_pengiriman").select("id_zona, nama_zona, tarif, is_aktif, urutan").order("urutan").order("id_zona"),
  ]);
  const webhook = `${origin}/api/midtrans/webhook`;

  return (
    <>
      <JudulHalaman judul="Pengaturan Toko" deskripsi="Profil toko, jam operasional, area pengiriman, pembayaran, dan email notifikasi." />

      <div className="space-y-6">
        <Kartu>
          <h2 className="mb-4 font-serif text-2xl font-bold">Profil Toko</h2>
          <FormProfilToko toko={toko} />
        </Kartu>

        <Kartu>
          <h2 className="mb-4 font-serif text-2xl font-bold">Operasional & Pemesanan</h2>
          <FormOperasional toko={toko} />
        </Kartu>

        <Kartu>
          <h2 className="mb-1 font-serif text-2xl font-bold">Area & Tarif Kirim</h2>
          <p className="mb-4 text-sm text-abu">Alamat di luar area aktif tidak bisa checkout. Pesanan ambil di toko selalu gratis ongkir.</p>
          <div className="space-y-5">
            {((zona ?? []) as Zona[]).map((z) => (
              <div key={z.id_zona} className="border-b border-garis pb-5 last:border-0">
                <FormZona zona={z} />
              </div>
            ))}
            <div className="rounded-xl bg-sage-muda p-4">
              <p className="mb-3 text-sm font-semibold">Tambah area</p>
              <FormZona />
            </div>
          </div>
        </Kartu>

        <Kartu className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Pembayaran QRIS (Midtrans)</h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              Mode: <span className="font-semibold">{midtransProduksi() ? "Production (uang asli)" : "Sandbox (demo)"}</span>
            </li>
            <Cek ok={Boolean(process.env.MIDTRANS_SERVER_KEY)} label="MIDTRANS_SERVER_KEY" />
            <Cek ok={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} label="SUPABASE_SERVICE_ROLE_KEY" />
            <Cek ok={Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)} label="SMTP email" />
          </ul>
          <div>
            <p className="text-sm font-semibold">Payment Notification URL</p>
            <p className="text-xs text-abu">
              Isi di dashboard Midtrans: Settings &gt; Configuration &gt; Payment Notification URL. Harus alamat publik (https), bukan localhost.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all rounded-lg bg-krem-tua px-3 py-1.5 text-xs">{webhook}</code>
              <TombolSalin teks={webhook} label="Salin URL" />
            </div>
          </div>
        </Kartu>

        <Kartu>
          <h2 className="mb-4 font-serif text-2xl font-bold">Template Email</h2>
          <FormTemplateEmail toko={toko} />
        </Kartu>
      </div>
    </>
  );
}
