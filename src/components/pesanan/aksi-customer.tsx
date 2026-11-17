"use client";

import { useActionState, useState } from "react";
import { Copy, Check } from "lucide-react";
import { batalkanPesananSaya, buatQr, cekStatusBayar } from "@/lib/actions/pesanan";
import { Pesan } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";

export function FormBatalkan({ kode }: { kode: string }) {
  const [state, action, pending] = useActionState(batalkanPesananSaya, null);
  return (
    <FormAksi
      aksi={action} pending={pending}
      onSubmit={(e) => {
        if (!window.confirm("Batalkan pesanan ini? Stok akan dikembalikan dan QRIS tidak bisa dipakai lagi.")) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="kode" value={kode} />
      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim varian="bahaya" className="w-full" teksProses="Membatalkan…">
        Batalkan Pesanan
      </TombolKirim>
    </FormAksi>
  );
}

export function FormBuatQr({ kode, label = "Tampilkan QRIS" }: { kode: string; label?: string }) {
  const [state, action, pending] = useActionState(buatQr, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-2">
      <input type="hidden" name="kode" value={kode} />
      <Pesan error={state?.error} />
      <TombolKirim className="w-full" teksProses="Membuat QRIS…">
        {label}
      </TombolKirim>
    </FormAksi>
  );
}

export function FormCekStatus({ kode }: { kode: string }) {
  const [state, action, pending] = useActionState(cekStatusBayar, null);
  return (
    <FormAksi aksi={action} pending={pending} className="space-y-2">
      <input type="hidden" name="kode" value={kode} />
      <Pesan error={state?.error} ok={state?.ok} />
      <TombolKirim varian="garis" className="w-full" teksProses="Mengecek…">
        Saya sudah bayar, cek status
      </TombolKirim>
    </FormAksi>
  );
}

export function TombolSalin({ teks, label = "Salin" }: { teks: string; label?: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(teks);
          setTersalin(true);
          window.setTimeout(() => setTersalin(false), 2000);
        } catch {
          window.prompt("Salin teks ini:", teks);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-zaitun-tua hover:bg-sage-muda"
    >
      {tersalin ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {tersalin ? "Tersalin" : label}
    </button>
  );
}
