"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Pemicu = { event: "INSERT" | "UPDATE"; table: string; filter: string };

/**
 * Dengarkan perubahan data lewat Supabase Realtime, lalu muat ulang data halaman.
 * Beberapa event yang datang berdekatan (mis. pembayaran lunas memicu update pesanan
 * dan notifikasi sekaligus) digabung jadi satu kali refresh.
 */
export function RealtimeSegarkan({ kanal, pemicu }: { kanal: string; pemicu: Pemicu }) {
  const router = useRouter();
  const { event, table, filter } = pemicu;

  useEffect(() => {
    const supabase = createClient();
    let jeda: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(kanal)
      .on("postgres_changes", { event, schema: "public", table, filter }, () => {
        clearTimeout(jeda);
        jeda = setTimeout(() => router.refresh(), 400);
      })
      .subscribe();
    return () => {
      clearTimeout(jeda);
      supabase.removeChannel(channel);
    };
  }, [kanal, event, table, filter, router]);

  return null;
}
