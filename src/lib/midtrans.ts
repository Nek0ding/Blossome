import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Midtrans Core API untuk QRIS.
 * Dokumentasi: https://docs.midtrans.com/reference/qris
 */

export function midtransProduksi(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

function baseUrl(): string {
  return midtransProduksi() ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi di .env.local");
  return key;
}

function headerAuth(): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Basic " + Buffer.from(serverKey() + ":").toString("base64"),
  };
}

export interface ResponMidtrans {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  fraud_status?: string;
  expiry_time?: string;
  qr_string?: string;
  signature_key?: string;
  actions?: { name: string; method: string; url: string }[];
  [kunci: string]: unknown;
}

async function panggil(path: string, init: RequestInit): Promise<ResponMidtrans> {
  let res: Response;
  try {
    // Batas waktu 15 detik supaya halaman tidak menggantung kalau Midtrans lambat
    res = await fetch(baseUrl() + path, { ...init, headers: headerAuth(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    const habisWaktu = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new Error(habisWaktu ? "Midtrans tidak merespons (timeout)." : "Tidak bisa terhubung ke Midtrans.");
  }
  const teks = await res.text();
  try {
    return JSON.parse(teks) as ResponMidtrans;
  } catch {
    throw new Error(`Midtrans membalas dengan format tidak dikenal (HTTP ${res.status})`);
  }
}

/** Buat transaksi QRIS dinamis sesuai nominal. */
export async function chargeQris(input: {
  orderId: string;
  nominal: number;
  menitKedaluwarsa: number;
  namaPelanggan?: string;
  emailPelanggan?: string;
}): Promise<ResponMidtrans> {
  const respon = await panggil("/v2/charge", {
    method: "POST",
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: input.orderId, gross_amount: Math.round(input.nominal) },
      qris: { acquirer: "gopay" },
      custom_expiry: { expiry_duration: input.menitKedaluwarsa, unit: "minute" },
      customer_details: {
        first_name: input.namaPelanggan?.slice(0, 50) || undefined,
        email: input.emailPelanggan || undefined,
      },
    }),
  });
  if (respon.status_code !== "201" || !respon.qr_string) {
    throw new Error(`Midtrans menolak transaksi: ${respon.status_message ?? "tidak ada pesan"} (${respon.status_code ?? "?"})`);
  }
  return respon;
}

/** Ambil status terbaru transaksi langsung dari Midtrans. */
export async function statusTransaksi(orderId: string): Promise<ResponMidtrans> {
  return panggil(`/v2/${encodeURIComponent(orderId)}/status`, { method: "GET" });
}

/** Batalkan transaksi yang masih pending supaya QR-nya tidak bisa dibayar lagi. */
export async function batalkanTransaksi(orderId: string): Promise<ResponMidtrans> {
  return panggil(`/v2/${encodeURIComponent(orderId)}/cancel`, { method: "POST" });
}

/** Verifikasi signature notifikasi: SHA512(order_id + status_code + gross_amount + server key). */
export function signatureValid(body: ResponMidtrans): boolean {
  const { order_id, status_code, gross_amount, signature_key } = body;
  if (!order_id || !status_code || !gross_amount || typeof signature_key !== "string") return false;
  const harapan = createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${serverKey()}`)
    .digest("hex");
  const a = Buffer.from(harapan, "utf8");
  const b = Buffer.from(signature_key.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** URL gambar QR dari respons charge (dipakai untuk simulator sandbox). */
export function urlGambarQr(respon: ResponMidtrans): string | null {
  return respon.actions?.find((a) => a.name === "generate-qr-code")?.url ?? null;
}

/** "2026-11-16 18:30:00" (WIB) -> Date */
export function parseWaktuMidtrans(waktu: string | undefined): Date | null {
  if (!waktu || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(waktu)) return null;
  const d = new Date(waktu.replace(" ", "T") + "+07:00");
  return Number.isNaN(d.getTime()) ? null : d;
}
