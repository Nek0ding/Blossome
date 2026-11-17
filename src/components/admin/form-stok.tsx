"use client";

import { useActionState, useEffect, useRef } from "react";
import { sesuaikanStok } from "@/lib/actions/admin";
import { kelasInput } from "@/components/ui";
import { cn } from "@/lib/cn";
import { FormAksi, TombolKirim } from "@/components/form";

export function FormStok({ jenis, id, nama }: { jenis: "produk" | "addon"; id: number; nama: string }) {
  const [state, action, pending] = useActionState(sesuaikanStok, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <div>
      <FormAksi ref={ref} aksi={action} pending={pending} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="jenis" value={jenis} />
        <input type="hidden" name="id" value={id} />
        <select name="arah" aria-label={`Jenis perubahan stok ${nama}`} className={cn(kelasInput, "w-28 py-1.5")} defaultValue="tambah">
          <option value="tambah">Tambah</option>
          <option value="kurang">Kurangi</option>
        </select>
        <input
          name="jumlah"
          type="number"
          min={1}
          max={9999}
          required
          placeholder="Jml"
          aria-label={`Jumlah perubahan stok ${nama}`}
          className={cn(kelasInput, "w-20 py-1.5")}
        />
        <input
          name="keterangan"
          required
          maxLength={200}
          placeholder="Keterangan"
          aria-label={`Keterangan perubahan stok ${nama}`}
          className={cn(kelasInput, "w-40 py-1.5")}
        />
        <TombolKirim varian="garis" kecil teksProses="…">
          Simpan
        </TombolKirim>
      </FormAksi>
      {state?.error ? <p role="alert" className="mt-1 text-xs text-red-700">{state.error}</p> : null}
      {state?.ok ? <p role="status" className="mt-1 text-xs text-emerald-700">{state.ok}</p> : null}
    </div>
  );
}
