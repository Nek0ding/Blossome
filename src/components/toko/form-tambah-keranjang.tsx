"use client";

import { useActionState, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { tambahKeKeranjang } from "@/lib/actions/keranjang";
import { Pesan } from "@/components/ui";
import { FormAksi, TombolKirim } from "@/components/form";
import { rupiah } from "@/lib/format";
import type { Addon } from "@/lib/types";

function Penghitung({
  nilai,
  min,
  max,
  onUbah,
  label,
}: {
  nilai: number;
  min: number;
  max: number;
  onUbah: (n: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-garis bg-white">
      <button
        type="button"
        onClick={() => onUbah(Math.max(min, nilai - 1))}
        disabled={nilai <= min}
        aria-label={`Kurangi ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda disabled:opacity-40"
      >
        <Minus size={16} aria-hidden />
      </button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
        {nilai}
      </span>
      <button
        type="button"
        onClick={() => onUbah(Math.min(max, nilai + 1))}
        disabled={nilai >= max}
        aria-label={`Tambah ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-zaitun-tua hover:bg-sage-muda disabled:opacity-40"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}

export function FormTambahKeranjang({
  idProduk,
  slug,
  harga,
  stok,
  addons,
  sudahLogin,
}: {
  idProduk: number;
  slug: string;
  harga: number;
  stok: number;
  addons: Addon[];
  sudahLogin: boolean;
}) {
  const [state, action, pending] = useActionState(tambahKeKeranjang, null);
  const [jumlah, setJumlah] = useState(1);
  const [pilihan, setPilihan] = useState<Record<number, number>>({});

  const total = useMemo(() => {
    const tambahan = addons.reduce((n, a) => n + (pilihan[a.id_addon] ?? 0) * a.harga, 0);
    return harga * jumlah + tambahan;
  }, [addons, harga, jumlah, pilihan]);

  if (stok <= 0) {
    return (
      <p className="rounded-xl border border-garis bg-krem-tua px-4 py-3 text-sm text-abu">
        Stok produk ini sedang habis. Cek lagi nanti atau hubungi kami untuk pesanan custom.
      </p>
    );
  }

  return (
    <FormAksi aksi={action} pending={pending} className="space-y-5">
      <input type="hidden" name="id_produk" value={idProduk} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="jumlah" value={jumlah} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-tinta">Jumlah</p>
          <p className="text-xs text-abu">Stok tersedia: {stok}</p>
        </div>
        <Penghitung nilai={jumlah} min={1} max={Math.min(99, stok)} onUbah={setJumlah} label="jumlah buket" />
      </div>

      {addons.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-semibold text-tinta">Tambahan (opsional)</legend>
          <p className="text-xs text-abu">Pilih Kartu Ucapan kalau ingin menulis pesan untuk penerima.</p>
          <ul className="mt-3 divide-y divide-garis rounded-2xl border border-garis bg-white">
            {addons.map((a) => {
              const qty = pilihan[a.id_addon] ?? 0;
              const habis = a.stok <= 0;
              return (
                <li key={a.id_addon} className="flex items-center justify-between gap-3 px-4 py-3">
                  <input type="hidden" name={`addon_${a.id_addon}`} value={qty} />
                  <div>
                    <p className="text-sm font-medium text-tinta">{a.nama_addon}</p>
                    <p className="text-xs text-abu">
                      {habis ? "Stok habis" : `+ ${rupiah(a.harga)}`}
                    </p>
                  </div>
                  {habis ? null : (
                    <Penghitung
                      nilai={qty}
                      min={0}
                      max={Math.min(99, a.stok)}
                      onUbah={(n) => setPilihan((p) => ({ ...p, [a.id_addon]: n }))}
                      label={a.nama_addon}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl bg-sage-muda px-4 py-3">
        <span className="text-sm text-abu">Subtotal</span>
        <span className="text-lg font-bold text-zaitun-tua">{rupiah(total)}</span>
      </div>

      <Pesan error={state?.error} />
      <TombolKirim className="w-full py-3" teksProses="Menambahkan…">
        {sudahLogin ? "Tambah ke Keranjang" : "Masuk untuk Memesan"}
      </TombolKirim>
    </FormAksi>
  );
}
