import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormCheckout, type ItemCheckout } from "@/components/toko/form-checkout";
import { getProfil, wajibLogin } from "@/lib/auth";
import { getKeranjang, getZonaAktif, subtotalKeranjang } from "@/lib/data";
import { getPengaturan } from "@/lib/toko";
import { pilihanJadwal } from "@/lib/jadwal";
import { linkWa } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout" };

export default async function HalamanCheckout() {
  const sesi = await wajibLogin("/checkout");
  const [items, zona, toko, profil] = await Promise.all([getKeranjang(sesi.id), getZonaAktif(), getPengaturan(), getProfil()]);
  if (items.length === 0) redirect("/keranjang");

  const daftar: ItemCheckout[] = items.map((i) => ({
    id: i.id_keranjang_item,
    nama: i.produk?.nama_produk ?? "Produk",
    jumlah: i.jumlah,
    subtotal: subtotalKeranjang(i),
    addon: i.keranjang_addon.map((a) => `${a.addon?.nama_addon ?? "Addon"} × ${a.jumlah}`),
    punyaKartu: i.keranjang_addon.some((a) => a.addon?.is_kartu_ucapan),
  }));
  const subtotal = daftar.reduce((n, i) => n + i.subtotal, 0);
  const jadwal = pilihanJadwal(toko);

  return (
    <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="judul text-5xl">Checkout</h1>
        {!toko.is_buka ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Toko sedang tutup sementara, jadi pesanan belum bisa dibuat. Silakan cek lagi nanti.
          </p>
        ) : jadwal.length === 0 ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Belum ada jadwal pengiriman yang tersedia. Hubungi kami lewat WhatsApp.
          </p>
        ) : null}
        <div className="mt-8">
          <FormCheckout
            items={daftar}
            subtotal={subtotal}
            zona={zona}
            jadwal={jadwal}
            bawaan={{ nama: profil?.nama ?? "", noTelp: profil?.no_telp ?? "", alamat: profil?.alamat ?? "" }}
            linkWa={linkWa(toko.no_whatsapp, `Halo ${toko.nama_toko}, alamat pengiriman saya di luar area yang tersedia.`)}
          />
        </div>
      </div>
    </div>
  );
}
