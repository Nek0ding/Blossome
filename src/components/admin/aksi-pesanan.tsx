"use client";

import { useActionState, useState } from "react";
import { ubahStatus } from "@/lib/actions/admin";
import { Kolom, Pesan, kelasInput } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";
import type { MetodePengiriman, StatusPesanan } from "@/lib/types";

/** Tombol transisi status sesuai aturan di database. */
export function AksiStatusPesanan({
  idPesanan,
  status,
  metode,
}: {
  idPesanan: number;
  status: StatusPesanan;
  metode: MetodePengiriman;
}) {
  const [state, action, pending] = useActionState(ubahStatus, null);
  const [modeBatal, setModeBatal] = useState(false);

  let berikutnya: { status: StatusPesanan; label: string } | null = null;
  if (status === "diproses") {
    berikutnya = metode === "kirim" ? { status: "dikirim", label: "Tandai Dikirim" } : { status: "siap_diambil", label: "Tandai Siap Diambil" };
  } else if (status === "dikirim" || status === "siap_diambil") {
    berikutnya = { status: "selesai", label: "Tandai Selesai" };
  }
  const bisaBatal = status === "belum_dibayar" || status === "diproses";

  if (!berikutnya && !bisaBatal) {
    return <p className="text-sm text-abu">Pesanan sudah di status akhir. Tidak ada aksi lagi.</p>;
  }

  return (
    <div className="space-y-3">
      <Pesan error={state?.error} ok={state?.ok} />
      {berikutnya && !modeBatal ? (
        <FormAksi aksi={action} pending={pending} className="space-y-3">
          <input type="hidden" name="id_pesanan" value={idPesanan} />
          <input type="hidden" name="status" value={berikutnya.status} />
          <Kolom label="Catatan (opsional)" htmlFor="catatan-status" bantuan="Misalnya nama kurir atau info pengambilan.">
            <input id="catatan-status" name="catatan" maxLength={500} className={kelasInput} />
          </Kolom>
          <TombolKirim className="w-full" teksProses="Menyimpan…">
            {berikutnya.label}
          </TombolKirim>
        </FormAksi>
      ) : null}

      {bisaBatal ? (
        modeBatal ? (
          <FormAksi
            aksi={action} pending={pending}
            onSubmit={(e) => {
              if (!window.confirm("Yakin batalkan pesanan ini? Stok akan dikembalikan.")) e.preventDefault();
            }}
            className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <input type="hidden" name="id_pesanan" value={idPesanan} />
            <input type="hidden" name="status" value="dibatalkan" />
            <Kolom
              label="Alasan pembatalan"
              htmlFor="alasan"
              bantuan={status === "diproses" ? "Wajib diisi. Pesanan ini sudah dibayar, jadi refund diurus di luar sistem." : undefined}
            >
              <textarea id="alasan" name="catatan" required={status === "diproses"} maxLength={500} rows={2} className={kelasInput} />
            </Kolom>
            <div className="flex gap-2">
              <TombolKirim varian="bahaya" className="flex-1" teksProses="Membatalkan…">
                Batalkan Pesanan
              </TombolKirim>
              <button type="button" onClick={() => setModeBatal(false)} className="rounded-full px-4 text-sm font-medium text-abu hover:bg-white">
                Kembali
              </button>
            </div>
          </FormAksi>
        ) : (
          <button
            type="button"
            onClick={() => setModeBatal(true)}
            className="w-full rounded-full border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Batalkan Pesanan
          </button>
        )
      ) : null}
    </div>
  );
}
