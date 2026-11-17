import { NextResponse, type NextRequest } from "next/server";
import writeExcelFile from "write-excel-file/node";
import { getProfil } from "@/lib/auth";
import { getPenjualan, periodeBawaan, validTanggal } from "@/lib/laporan";
import { labelMetode, labelStatus } from "@/lib/format";

function waktuWib(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** CSV aman untuk Excel: kutip setiap sel dan cegah formula injection. */
function selCsv(nilai: string | number): string {
  let s = String(nilai);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"', '""')}"`;
}

const HEADER = ["Tanggal Bayar (WIB)", "Kode Pesanan", "Nama Pelanggan", "Email", "Item", "Tipe", "Metode", "Status", "Subtotal", "Ongkir", "Total"];

/** GET /admin/laporan/unduh?dari=YYYY-MM-DD&sampai=YYYY-MM-DD&format=csv|xlsx */
export async function GET(request: NextRequest) {
  const profil = await getProfil();
  if (profil?.role !== "admin") return NextResponse.json({ pesan: "Akses ditolak" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const bawaan = periodeBawaan();
  let dari = sp.get("dari") ?? "";
  let sampai = sp.get("sampai") ?? "";
  if (!validTanggal(dari)) dari = bawaan.dari;
  if (!validTanggal(sampai)) sampai = bawaan.sampai;
  if (dari > sampai) [dari, sampai] = [sampai, dari];
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";

  const baris = await getPenjualan(dari, sampai);
  const namaFile = `laporan-penjualan-blossome_${dari}_${sampai}.${format}`;
  const total = baris.reduce((n, b) => n + b.total, 0);

  if (format === "csv") {
    const isi = [
      HEADER.map(selCsv).join(","),
      ...baris.map((b) =>
        [
          waktuWib(b.dibayar_at),
          b.kode_pesanan,
          b.nama_pelanggan,
          b.email_pelanggan,
          b.item,
          b.tipe === "custom" ? "Custom" : "Katalog",
          labelMetode(b.metode),
          labelStatus(b.status),
          b.subtotal,
          b.ongkir,
          b.total,
        ]
          .map(selCsv)
          .join(","),
      ),
      ["", "", "", "", "", "", "", "", "", "TOTAL", total].map(selCsv).join(","),
    ].join("\r\n");
    return new NextResponse("﻿" + isi, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${namaFile}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const tebal = (value: string) => ({ value, fontWeight: "bold" as const });
  const uang = (value: number) => ({ value, format: "#,##0" });
  const data = [
    HEADER.map(tebal),
    ...baris.map((b) => [
      { value: waktuWib(b.dibayar_at) },
      { value: b.kode_pesanan },
      { value: b.nama_pelanggan },
      { value: b.email_pelanggan },
      { value: b.item },
      { value: b.tipe === "custom" ? "Custom" : "Katalog" },
      { value: labelMetode(b.metode) },
      { value: labelStatus(b.status) },
      uang(b.subtotal),
      uang(b.ongkir),
      uang(b.total),
    ]),
    [null, null, null, null, null, null, null, null, null, tebal("TOTAL"), { ...uang(total), fontWeight: "bold" as const }],
  ];
  const buffer = await writeExcelFile(data, {
    columns: [{ width: 18 }, { width: 14 }, { width: 22 }, { width: 26 }, { width: 40 }, { width: 10 }, { width: 18 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 12 }],
  }).toBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
