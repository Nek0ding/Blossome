import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import { labelMetode, labelSlot, labelStatus, rupiah, tanggalJam, tanggalPanjang } from "@/lib/format";
import type { PesananLengkap, StatusPesanan } from "@/lib/types";

/** Daftar item, addon, dan ucapan kartu dalam satu pesanan. */
export function DaftarItem({ pesanan }: { pesanan: PesananLengkap }) {
  return (
    <div>
      <ul className="divide-y divide-garis">
        {pesanan.detail_pesanan.map((d) => (
          <li key={d.id_detail} className="py-3 first:pt-0">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-tinta">
                  {d.nama_item} × {d.jumlah}
                </p>
                <p className="text-xs text-abu">{rupiah(d.harga_satuan)} / buket</p>
              </div>
              <p className="shrink-0 font-semibold">{rupiah(d.subtotal)}</p>
            </div>
            {d.deskripsi_custom ? <p className="mt-1 whitespace-pre-line text-sm text-abu">{d.deskripsi_custom}</p> : null}
            {d.detail_addon.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-sm text-abu">
                {d.detail_addon.map((a) => (
                  <li key={a.id_detail_addon} className="flex justify-between gap-3">
                    <span>
                      + {a.nama_addon} × {a.jumlah}
                    </span>
                    <span>{rupiah(a.subtotal)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {d.ucapan_kartu ? (
              <blockquote className="mt-2 rounded-xl bg-pink-muda px-3 py-2 text-sm italic text-tinta">
                “{d.ucapan_kartu}”
              </blockquote>
            ) : null}
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t border-garis pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-abu">Subtotal</dt>
          <dd>{rupiah(pesanan.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-abu">Ongkir{pesanan.zona_pengiriman ? ` (${pesanan.zona_pengiriman.nama_zona})` : ""}</dt>
          <dd>{pesanan.metode_pengiriman === "ambil" ? "Gratis" : rupiah(pesanan.ongkir)}</dd>
        </div>
        <div className="flex justify-between text-base font-bold">
          <dt>Total</dt>
          <dd className="text-zaitun-tua">{rupiah(pesanan.total_harga)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Data penerima dan jadwal. */
export function InfoPengiriman({ pesanan, alamatToko }: { pesanan: PesananLengkap; alamatToko?: string }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-abu">Penerima</dt>
        <dd className="font-medium">{pesanan.nama_penerima}</dd>
        <dd>{pesanan.no_telp_penerima}</dd>
      </div>
      <div>
        <dt className="text-abu">Metode</dt>
        <dd className="font-medium">{labelMetode(pesanan.metode_pengiriman)}</dd>
      </div>
      <div>
        <dt className="text-abu">Jadwal</dt>
        <dd className="font-medium">{tanggalPanjang(pesanan.tanggal_kirim)}</dd>
        <dd>{labelSlot(pesanan.slot_kirim)}</dd>
      </div>
      <div>
        <dt className="text-abu">{pesanan.metode_pengiriman === "kirim" ? "Alamat pengiriman" : "Alamat toko"}</dt>
        <dd className="whitespace-pre-line">
          {pesanan.metode_pengiriman === "kirim" ? pesanan.alamat_pengiriman : (alamatToko ?? "-")}
        </dd>
      </div>
      {pesanan.catatan ? (
        <div className="sm:col-span-2">
          <dt className="text-abu">Catatan</dt>
          <dd className="whitespace-pre-line">{pesanan.catatan}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Urutan status sesuai metode pesanan, untuk progress di atas timeline. */
export function urutanStatus(metode: PesananLengkap["metode_pengiriman"]): StatusPesanan[] {
  return ["belum_dibayar", "diproses", metode === "kirim" ? "dikirim" : "siap_diambil", "selesai"];
}

export function ProgresStatus({ pesanan }: { pesanan: PesananLengkap }) {
  if (pesanan.status === "dibatalkan") {
    return (
      <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
        Pesanan dibatalkan{pesanan.alasan_batal ? `: ${pesanan.alasan_batal}` : "."}
      </p>
    );
  }
  const urutan = urutanStatus(pesanan.metode_pengiriman);
  const posisi = urutan.indexOf(pesanan.status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Progres pesanan">
      {urutan.map((s, i) => {
        const selesai = i < posisi || pesanan.status === "selesai";
        const aktif = i === posisi;
        return (
          <li key={s} className="flex flex-col items-center gap-2 text-center">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                selesai ? "bg-zaitun text-white" : aktif ? "bg-rose text-white" : "bg-sage-muda text-abu",
              )}
              aria-hidden="true"
            >
              {selesai ? <Check size={16} /> : i + 1}
            </span>
            <span className={cn("text-xs", aktif ? "font-semibold text-tinta" : "text-abu")}>
              {labelStatus(s)}
              {aktif ? <span className="sr-only"> (status sekarang)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineStatus({ pesanan }: { pesanan: PesananLengkap }) {
  const riwayat = [...pesanan.riwayat_status].reverse();
  return (
    <ol className="space-y-4 border-l-2 border-sage pl-5">
      {riwayat.map((r) => (
        <li key={r.id_riwayat} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-zaitun" aria-hidden="true" />
          <p className="text-sm font-semibold">{labelStatus(r.status)}</p>
          {r.catatan ? <p className="text-sm text-abu">{r.catatan}</p> : null}
          <p className="text-xs text-abu">{tanggalJam(r.created_at)}</p>
        </li>
      ))}
    </ol>
  );
}
