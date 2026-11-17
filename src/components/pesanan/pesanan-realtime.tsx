import { RealtimeSegarkan } from "@/components/realtime-segarkan";

/** Muat ulang halaman setiap kali status pesanan ini berubah (mis. pembayaran diterima lewat webhook). */
export function PesananRealtime({ idPesanan }: { idPesanan: number }) {
  return (
    <RealtimeSegarkan
      kanal={`pesanan-${idPesanan}`}
      pemicu={{ event: "UPDATE", table: "pesanan", filter: `id_pesanan=eq.${idPesanan}` }}
    />
  );
}
