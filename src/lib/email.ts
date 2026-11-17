import "server-only";

import nodemailer from "nodemailer";
import type { TemplateEmail } from "./types";

function smtpSiap(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function escapeHtml(teks: string): string {
  return teks
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

let transporterCache: ReturnType<typeof nodemailer.createTransport> | null = null;

/**
 * Objek transporter dibuat sekali lalu dipakai ulang. Tanpa pool: di serverless (Vercel) koneksi yang
 * menganggur bisa diputus saat fungsi "tidur", jadi setiap email membuka koneksi baru yang pasti segar.
 */
function ambilTransporter(port: number) {
  transporterCache ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporterCache;
}

/** Ganti {variabel} di template dengan nilainya. */
export function isiTemplate(teks: string, variabel: Record<string, string>): string {
  return teks.replace(/\{(\w+)\}/g, (asli, kunci: string) => variabel[kunci] ?? asli);
}

/**
 * Kirim email teks sederhana. Mengembalikan false kalau SMTP belum diatur
 * atau pengiriman gagal, supaya alur pesanan tidak ikut gagal.
 */
export async function kirimEmail(input: {
  kepada: string;
  template: TemplateEmail;
  variabel: Record<string, string>;
  tautan?: { label: string; url: string };
}): Promise<boolean> {
  if (!smtpSiap() || !input.kepada) return false;

  // Baris baru di subjek bisa dipakai menyisipkan header email: dibuang.
  const subjek = isiTemplate(input.template.subjek, input.variabel).replace(/[\r\n]+/g, " ").slice(0, 200);
  const isi = isiTemplate(input.template.isi, input.variabel);
  const port = Number(process.env.SMTP_PORT || 465);

  try {
    const transporter = ambilTransporter(port);

    const tautanTeks = input.tautan ? `\n\n${input.tautan.label}: ${input.tautan.url}` : "";
    const tautanHtml = input.tautan
      ? `<p style="margin:24px 0 0"><a href="${escapeHtml(input.tautan.url)}" style="background:#6F7B4B;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${escapeHtml(input.tautan.label)}</a></p>`
      : "";

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: input.kepada,
      subject: subjek,
      text: isi + tautanTeks,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2E2E2B;max-width:520px">${escapeHtml(isi).replaceAll("\n", "<br>")}${tautanHtml}</div>`,
    });
    return true;
  } catch (err) {
    console.error("[email] gagal mengirim:", err);
    return false;
  }
}
