import { RealtimeSegarkan } from "./realtime-segarkan";

/** Muat ulang data halaman saat ada notifikasi baru untuk pengguna ini (angka lonceng ikut berubah). */
export function NotifRealtime({ idUser }: { idUser: string }) {
  return (
    <RealtimeSegarkan
      kanal={`notif-${idUser}`}
      pemicu={{ event: "INSERT", table: "notifikasi", filter: `id_user=eq.${idUser}` }}
    />
  );
}
