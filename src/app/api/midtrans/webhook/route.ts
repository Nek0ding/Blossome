import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { TAG_KATALOG } from "@/lib/data";
import { signatureValid, type ResponMidtrans } from "@/lib/midtrans";
import { terapkanStatusMidtrans } from "@/lib/pembayaran";

/**
 * Payment Notification URL untuk Midtrans:
 *   https://<domain>/api/midtrans/webhook
 * Signature diverifikasi, lalu status diambil ulang langsung dari API Midtrans
 * sebelum diterapkan ke database (jadi isi body tidak dipercaya mentah-mentah).
 */
/** Format order_id buatan kita: BLS-00001-1 */
const POLA_ORDER_ID = /^BLS-\d{5,10}-\d{1,3}$/;
const MAKS_BODY = 64 * 1024;

export async function POST(request: Request) {
  // Notifikasi Midtrans hanya beberapa KB. Tolak body besar sebelum diproses.
  if (Number(request.headers.get("content-length") ?? 0) > MAKS_BODY) {
    return NextResponse.json({ pesan: "Body terlalu besar" }, { status: 413 });
  }
  let body: ResponMidtrans;
  try {
    const teks = await request.text();
    if (teks.length > MAKS_BODY) return NextResponse.json({ pesan: "Body terlalu besar" }, { status: 413 });
    body = JSON.parse(teks) as ResponMidtrans;
    if (!body || typeof body !== "object") throw new Error("bukan objek");
  } catch {
    return NextResponse.json({ pesan: "Body bukan JSON" }, { status: 400 });
  }

  if (!process.env.MIDTRANS_SERVER_KEY) {
    console.error("[webhook] MIDTRANS_SERVER_KEY belum diisi");
    return NextResponse.json({ pesan: "Server belum dikonfigurasi" }, { status: 500 });
  }
  if (!signatureValid(body)) {
    return NextResponse.json({ pesan: "Signature tidak valid" }, { status: 401 });
  }

  const orderId = String(body.order_id);
  // Order dari "Send test notification" di dashboard Midtrans tidak berformat BLS-xxxxx-n: balas 200 tanpa diproses.
  if (!POLA_ORDER_ID.test(orderId)) return NextResponse.json({ ok: true, hasil: "diabaikan" });
  try {
    const { hasil } = await terapkanStatusMidtrans(orderId);
    // Pesanan kedaluwarsa dibatalkan -> stok kembali, jadi cache katalog dibersihkan.
    if (hasil === "pesanan_dibatalkan") revalidateTag(TAG_KATALOG, { expire: 0 });
    // Order dari tes "Send test notification" di dashboard tidak ada di database: tetap balas 200.
    return NextResponse.json({ ok: true, hasil });
  } catch (err) {
    console.error(`[webhook] gagal memproses ${orderId}:`, err);
    // 500 membuat Midtrans mencoba mengirim ulang notifikasi.
    return NextResponse.json({ pesan: "Gagal memproses" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true, pesan: "Webhook Midtrans Blossomé aktif. Gunakan POST." });
}
