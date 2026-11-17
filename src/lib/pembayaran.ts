import "server-only";

import { after } from "next/server";
import { createAdminClient } from "./supabase/admin";
import {
  batalkanTransaksi,
  chargeQris,
  parseWaktuMidtrans,
  statusTransaksi,
  urlGambarQr,
} from "./midtrans";
import { kirimEmail } from "./email";
import { rupiah } from "./format";
import type { Pembayaran, PengaturanToko } from "./types";

type HasilPembayaran = { ok: true; pembayaran: Pembayaran } | { ok: false; pesan: string };

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Baris "menunggu" tanpa QR = QRIS sedang dibuat oleh request lain. Dianggap macet setelah 45 detik. */
const BATAS_PENYIAPAN_MS = 45_000;

/**
 * Pastikan pesanan punya QRIS yang masih aktif. Kalau belum ada atau sudah kedaluwarsa,
 * buat transaksi baru di Midtrans. Pemanggil wajib sudah mengecek bahwa pengguna berhak atas pesanan ini.
 *
 * Aman dari klik ganda: sebelum memanggil Midtrans, baris pembayaran "dipesan" dulu dengan
 * gateway_order_id unik. Request kedua yang bentrok menunggu QR dari request pertama.
 */
export async function pastikanPembayaran(idPesanan: number, percobaan = 0): Promise<HasilPembayaran> {
  const admin = createAdminClient();

  const { data: pesanan } = await admin
    .from("pesanan")
    .select("id_pesanan, kode_pesanan, id_user, total_harga, status, batas_bayar_at")
    .eq("id_pesanan", idPesanan)
    .maybeSingle();
  if (!pesanan) return { ok: false, pesan: "Pesanan tidak ditemukan." };
  if (pesanan.status !== "belum_dibayar") return { ok: false, pesan: "Pesanan ini tidak sedang menunggu pembayaran." };

  const sekarang = Date.now();
  const batas = new Date(pesanan.batas_bayar_at).getTime();
  const sisaMenit = Math.floor((batas - sekarang) / 60000);
  if (sisaMenit < 1) return { ok: false, pesan: "Batas waktu pembayaran sudah habis." };

  const { data: daftar } = await admin
    .from("pembayaran")
    .select("*")
    .eq("id_pesanan", idPesanan)
    .order("id_pembayaran", { ascending: false });
  const semua = (daftar ?? []) as Pembayaran[];
  const menunggu = semua.filter((p) => p.status_bayar === "menunggu");

  const aktif = menunggu.find((p) => p.qris_payload && new Date(p.kadaluarsa_at).getTime() > sekarang + 30_000);
  if (aktif) return { ok: true, pembayaran: aktif };

  // QR sedang disiapkan request lain (mis. klik ganda): tunggu sebentar lalu cek ulang
  const disiapkan = menunggu.find((p) => !p.qris_payload && sekarang - new Date(p.created_at).getTime() < BATAS_PENYIAPAN_MS);
  if (disiapkan) {
    if (percobaan >= 8) return { ok: false, pesan: "QRIS sedang disiapkan. Muat ulang halaman sebentar lagi." };
    await tunggu(750);
    return pastikanPembayaran(idPesanan, percobaan + 1);
  }

  // Penyiapan yang macet ditandai gagal
  const macet = menunggu.filter((p) => !p.qris_payload).map((p) => p.id_pembayaran);
  if (macet.length > 0) {
    await admin.from("pembayaran").update({ status_bayar: "gagal" }).in("id_pembayaran", macet).eq("status_bayar", "menunggu");
  }

  // QR lama yang hampir/ sudah kedaluwarsa: pastikan belum dibayar, lalu tutup supaya tidak bisa dibayar dobel
  if (menunggu.some((p) => p.qris_payload)) {
    const { sudahDibayar } = await tutupTransaksiMenunggu(idPesanan);
    if (sudahDibayar) return { ok: false, pesan: "Pembayaran sudah kami terima. Muat ulang halaman." };
  }

  const [{ data: toko }, { data: profil }] = await Promise.all([
    admin.from("pengaturan_toko").select("batas_bayar_menit").eq("id", 1).single(),
    admin.from("profiles").select("nama, email").eq("id", pesanan.id_user).maybeSingle(),
  ]);
  const menit = Math.max(1, Math.min(Number(toko?.batas_bayar_menit ?? 30), sisaMenit));
  const orderId = `${pesanan.kode_pesanan}-${semua.length + 1}`;
  const nominal = Number(pesanan.total_harga);

  // "Pesan" nomor transaksi dulu. Constraint unik gateway_order_id menjadi penengah kalau ada dua request bersamaan.
  const { data: slot, error: errSlot } = await admin
    .from("pembayaran")
    .insert({
      id_pesanan: idPesanan,
      metode: "qris",
      nominal,
      gateway_order_id: orderId,
      status_bayar: "menunggu",
      kadaluarsa_at: new Date(sekarang + menit * 60000).toISOString(),
    })
    .select("id_pembayaran")
    .single();
  if (errSlot || !slot) {
    if (errSlot?.code === "23505" && percobaan < 8) {
      await tunggu(750);
      return pastikanPembayaran(idPesanan, percobaan + 1);
    }
    console.error("[pembayaran] gagal menyiapkan baris:", errSlot);
    return { ok: false, pesan: "Gagal menyiapkan pembayaran. Coba lagi." };
  }

  let respon;
  try {
    respon = await chargeQris({
      orderId,
      nominal,
      menitKedaluwarsa: menit,
      namaPelanggan: profil?.nama,
      emailPelanggan: profil?.email,
    });
  } catch (err) {
    console.error("[midtrans] charge gagal:", err);
    await admin.from("pembayaran").update({ status_bayar: "gagal" }).eq("id_pembayaran", slot.id_pembayaran);
    return { ok: false, pesan: "QRIS belum bisa dibuat. Coba lagi sebentar." };
  }

  const kedaluwarsa = parseWaktuMidtrans(respon.expiry_time) ?? new Date(sekarang + menit * 60000);
  const { data: baru, error } = await admin
    .from("pembayaran")
    .update({
      gateway_transaction_id: respon.transaction_id ?? null,
      qris_payload: respon.qr_string ?? null,
      qr_url: urlGambarQr(respon),
      kadaluarsa_at: kedaluwarsa.toISOString(),
      raw_response: respon,
    })
    .eq("id_pembayaran", slot.id_pembayaran)
    .eq("status_bayar", "menunggu")
    .select("*")
    .maybeSingle();
  if (error || !baru) {
    // Baris sudah tidak "menunggu" (mis. pesanan dibatalkan di saat yang sama). Tutup QR-nya di Midtrans.
    console.error("[pembayaran] gagal menyimpan QR:", error);
    await batalkanTransaksi(orderId).catch(() => undefined);
    return { ok: false, pesan: "Pesanan ini tidak sedang menunggu pembayaran." };
  }
  return { ok: true, pembayaran: baru as Pembayaran };
}

/**
 * Ambil status terbaru dari Midtrans untuk satu order_id lalu terapkan ke database.
 * Dipakai webhook dan tombol "Cek status pembayaran". Aman dipanggil berulang.
 */
export async function terapkanStatusMidtrans(orderId: string): Promise<{ hasil: string }> {
  const st = await statusTransaksi(orderId);
  if (st.status_code === "404" || !st.transaction_status) return { hasil: "tidak_ditemukan" };

  const admin = createAdminClient();
  const status = st.transaction_status;

  if (status === "settlement" || (status === "capture" && st.fraud_status === "accept")) {
    const { data: bayar } = await admin
      .from("pembayaran")
      .select("nominal")
      .eq("gateway_order_id", orderId)
      .maybeSingle();
    if (!bayar) return { hasil: "tidak_ditemukan" };
    if (Math.round(Number(st.gross_amount)) !== Math.round(Number(bayar.nominal))) {
      console.error(`[midtrans] nominal ${orderId} tidak cocok: ${st.gross_amount} vs ${bayar.nominal}`);
      return { hasil: "nominal_tidak_cocok" };
    }

    const { data, error } = await admin.rpc("tandai_pembayaran_lunas", {
      p_gateway_order_id: orderId,
      p_transaction_id: st.transaction_id ?? null,
      p_raw: st,
    });
    if (error) throw new Error(error.message);
    const hasil = String((data as { hasil?: string } | null)?.hasil ?? "");
    if (hasil === "lunas") {
      const idPesanan = Number((data as { id_pesanan?: number }).id_pesanan);
      // Email dikirim setelah respons selesai, jadi webhook/halaman tidak menunggu server SMTP.
      after(() => kirimEmailSetelahLunas(idPesanan).catch((err) => console.error("[email] setelah lunas:", err)));
    }
    return { hasil };
  }

  const peta: Record<string, "kedaluwarsa" | "dibatalkan" | "gagal"> = {
    expire: "kedaluwarsa",
    cancel: "dibatalkan",
    deny: "gagal",
    failure: "gagal",
  };
  const tujuan = peta[status];
  if (!tujuan) return { hasil: "menunggu" };

  const { data, error } = await admin.rpc("tandai_pembayaran_tidak_berhasil", {
    p_gateway_order_id: orderId,
    p_status: tujuan,
    p_raw: st,
  });
  if (error) throw new Error(error.message);
  const hasil = String((data as { hasil?: string } | null)?.hasil ?? "");
  // Bedakan dari "sudah_diproses" milik pembayaran lunas: di sini artinya transaksi sudah ditutup sebelumnya.
  return { hasil: hasil === "sudah_diproses" ? "sudah_ditutup" : hasil };
}

/**
 * Sebelum pesanan dibatalkan: pastikan belum ada pembayaran yang masuk,
 * lalu batalkan QR yang masih pending di Midtrans.
 * Mengembalikan pesan kalau pesanan ternyata sudah dibayar.
 */
export async function tutupTransaksiMenunggu(idPesanan: number): Promise<{ sudahDibayar: boolean }> {
  if (!process.env.MIDTRANS_SERVER_KEY) return { sudahDibayar: false };
  const admin = createAdminClient();
  const { data } = await admin
    .from("pembayaran")
    .select("gateway_order_id")
    .eq("id_pesanan", idPesanan)
    .eq("status_bayar", "menunggu");

  for (const p of data ?? []) {
    // Kalau status tidak bisa dicek (mis. Midtrans tidak terjangkau), error dilempar ke pemanggil
    // supaya pesanan TIDAK dibatalkan saat status pembayarannya belum pasti.
    const { hasil } = await terapkanStatusMidtrans(p.gateway_order_id);
    if (hasil === "lunas" || hasil === "sudah_diproses" || hasil === "perlu_tinjau") return { sudahDibayar: true };
    if (hasil === "menunggu") {
      await batalkanTransaksi(p.gateway_order_id).catch((err) => console.error("[midtrans] gagal membatalkan QR:", err));
      // Cek sekali lagi: pembayaran bisa masuk tepat sebelum QR dibatalkan
      const ulang = await terapkanStatusMidtrans(p.gateway_order_id);
      if (ulang.hasil === "lunas" || ulang.hasil === "perlu_tinjau") return { sudahDibayar: true };
    }
  }
  return { sudahDibayar: false };
}

/** Email "pembayaran berhasil" ke customer dan "orderan masuk" ke email toko. */
async function kirimEmailSetelahLunas(idPesanan: number): Promise<void> {
  const admin = createAdminClient();
  const [{ data: pesanan }, { data: toko }] = await Promise.all([
    admin.from("pesanan").select("id_pesanan, kode_pesanan, id_user, total_harga").eq("id_pesanan", idPesanan).single(),
    admin.from("pengaturan_toko").select("*").eq("id", 1).single(),
  ]);
  if (!pesanan || !toko) return;
  const pengaturan = toko as PengaturanToko;

  const { data: profil } = await admin.from("profiles").select("nama, email").eq("id", pesanan.id_user).maybeSingle();
  const situs = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const variabel = {
    nomor_pesanan: pesanan.kode_pesanan,
    nama_pelanggan: profil?.nama || "Pelanggan",
    total: rupiah(Number(pesanan.total_harga)),
    nama_toko: pengaturan.nama_toko,
  };

  const [keCustomer, keToko] = await Promise.all([
    profil?.email
      ? kirimEmail({
          kepada: profil.email,
          template: pengaturan.template_email.pembayaran_berhasil,
          variabel,
          tautan: situs ? { label: "Lihat pesanan", url: `${situs}/pesanan/${pesanan.kode_pesanan}` } : undefined,
        })
      : Promise.resolve(false),
    pengaturan.email
      ? kirimEmail({
          kepada: pengaturan.email,
          template: pengaturan.template_email.orderan_masuk,
          variabel,
          tautan: situs ? { label: "Buka pesanan", url: `${situs}/admin/pesanan/${pesanan.kode_pesanan}` } : undefined,
        })
      : Promise.resolve(false),
  ]);

  await admin.from("notifikasi").insert([
    {
      id_user: pesanan.id_user,
      id_pesanan: idPesanan,
      tipe: "pembayaran_berhasil",
      judul: `Email pembayaran ${pesanan.kode_pesanan}`,
      pesan: profil?.email ? `Dikirim ke ${profil.email}` : "Email pelanggan tidak tersedia",
      channel: "email",
      is_dibaca: true,
      email_terkirim: keCustomer,
    },
    {
      id_user: null,
      id_pesanan: idPesanan,
      tipe: "orderan_masuk",
      judul: `Email orderan masuk ${pesanan.kode_pesanan}`,
      pesan: pengaturan.email ? `Dikirim ke ${pengaturan.email}` : "Email toko belum diisi di Pengaturan Toko",
      channel: "email",
      is_dibaca: true,
      email_terkirim: keToko,
    },
  ]);
}
