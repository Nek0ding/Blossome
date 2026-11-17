"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { TAG_KATALOG } from "@/lib/data";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { wajibAdmin } from "@/lib/auth";
import { tutupTransaksiMenunggu } from "@/lib/pembayaran";
import { buatSlug } from "@/lib/format";
import { pesanDb } from "@/lib/galat";
import { NAMA_HARI, type FormState, type StatusPesanan } from "@/lib/types";

function teks(nilai: FormDataEntryValue | null): string {
  return String(nilai ?? "").trim();
}

/** Angka bulat dari input (titik/koma/spasi pemisah ribuan diabaikan). Kosong atau tidak valid -> NaN. */
function angka(nilai: FormDataEntryValue | null): number {
  const bersih = String(nilai ?? "").trim().replace(/[.,\s]/g, "");
  if (!/^-?\d{1,12}$/.test(bersih)) return NaN;
  return Number(bersih);
}

/** ID baris dari input hidden. null kalau kosong/tidak valid (artinya data baru). */
function idDari(nilai: FormDataEntryValue | null): number | null {
  const n = angka(nilai);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Skema angka bulat dengan pesan error berbahasa Indonesia (kosong/bukan angka juga tertangkap). */
function nomor(label: string, min: number, max: number) {
  return z
    .number({ error: `${label} wajib diisi dengan angka` })
    .int(`${label} harus angka bulat`)
    .min(min, `${label} minimal ${min.toLocaleString("id-ID")}`)
    .max(max, `${label} maksimal ${max.toLocaleString("id-ID")}`);
}

const STATUS_VALID: StatusPesanan[] = ["belum_dibayar", "diproses", "dikirim", "siap_diambil", "selesai", "dibatalkan"];

function centang(nilai: FormDataEntryValue | null): boolean {
  return nilai === "on" || nilai === "true" || nilai === "1";
}

function segarkan() {
  updateTag(TAG_KATALOG);
  revalidatePath("/", "layout");
}

const TIPE_GAMBAR = ["image/jpeg", "image/png", "image/webp"];
const MAKS_GAMBAR = 2 * 1024 * 1024;

function jenisGambar(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const teksDi = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (teksDi(0, 4) === "RIFF" && teksDi(8, 4) === "WEBP") return "image/webp";
  return null;
}

/** Unggah gambar ke bucket Storage. Mengembalikan URL publik, null kalau tidak ada file, atau pesan error. */
async function unggahGambar(file: FormDataEntryValue | null, bucket: "produk" | "addon", nama: string) {
  if (!(file instanceof File) || file.size === 0) return { url: null as string | null };
  if (!TIPE_GAMBAR.includes(file.type)) return { error: "Gambar harus JPG, PNG, atau WEBP." };
  if (file.size > MAKS_GAMBAR) return { error: "Ukuran gambar maksimal 2 MB." };

  // Jangan percaya tipe dari browser: cek tanda tangan (magic bytes) isi file.
  const kepala = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const tipeAsli = jenisGambar(kepala);
  if (!tipeAsli) return { error: "File bukan gambar JPG, PNG, atau WEBP yang valid." };

  const ekstensi = tipeAsli === "image/png" ? "png" : tipeAsli === "image/webp" ? "webp" : "jpg";
  // Nama file unik (acak) supaya dua unggahan bersamaan tidak bentrok dan cache CDN tidak menampilkan gambar lama.
  const path = `${(buatSlug(nama) || "gambar").slice(0, 60)}-${randomUUID().slice(0, 12)}.${ekstensi}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: tipeAsli,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[storage] unggah gagal:", error.message);
    return { error: "Gagal mengunggah gambar. Coba lagi." };
  }
  return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

/** Hapus file lama di Storage kalau URL-nya milik bucket kita. Gagal hapus tidak menghentikan proses. */
async function hapusGambarLama(url: string | null | undefined, bucket: "produk" | "addon") {
  if (!url) return;
  const penanda = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(penanda);
  if (i < 0) return;
  const supabase = await createClient();
  await supabase.storage.from(bucket).remove([decodeURIComponent(url.slice(i + penanda.length))]);
}

/* ---------------- Pesanan ---------------- */

export async function ubahStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const idPesanan = idDari(formData.get("id_pesanan"));
  const status = teks(formData.get("status")) as StatusPesanan;
  const catatan = teks(formData.get("catatan")).slice(0, 500);
  if (!idPesanan) return { error: "Pesanan tidak valid." };
  if (!STATUS_VALID.includes(status)) return { error: "Status tidak valid." };

  if (status === "dibatalkan") {
    try {
      const { sudahDibayar } = await tutupTransaksiMenunggu(idPesanan);
      if (sudahDibayar) {
        segarkan();
        return { error: "Pembayaran ternyata sudah masuk, jadi status sudah berubah ke Diproses. Cek lagi sebelum membatalkan." };
      }
    } catch (err) {
      console.error("[admin] gagal mengecek pembayaran:", err);
      return { error: "Status pembayaran di Midtrans belum bisa dicek. Pastikan kunci Midtrans dan Supabase sudah diisi, lalu coba lagi." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("ubah_status_pesanan", {
    p_id_pesanan: idPesanan,
    p_status: status,
    p_catatan: catatan || null,
  });
  segarkan();
  if (error) return { error: pesanDb(error, "Gagal mengubah status. Coba lagi.") };
  return { ok: "Status pesanan diperbarui." };
}

const skemaCustom = z.object({
  id_user: z.string().uuid("Pilih akun pelanggan"),
  nama_item: z.string().trim().min(3, "Nama item minimal 3 karakter").max(200),
  deskripsi: z.string().trim().max(1000),
  harga: nomor("Harga", 1, 1_000_000_000),
  jumlah: nomor("Jumlah", 1, 99),
  nama_penerima: z.string().trim().min(2, "Nama penerima wajib diisi").max(100),
  no_telp_penerima: z.string().transform((v) => v.replace(/[\s-]/g, "")).pipe(z.string().regex(/^\+?[0-9]{8,14}$/, "Nomor telepon penerima tidak valid")),
  metode: z.enum(["kirim", "ambil"]),
  tanggal_kirim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal"),
  slot_kirim: z.string().min(1, "Pilih jam"),
});

export async function buatPesananCustom(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const hasil = skemaCustom.safeParse({
    id_user: teks(formData.get("id_user")),
    nama_item: teks(formData.get("nama_item")),
    deskripsi: teks(formData.get("deskripsi")),
    harga: angka(formData.get("harga")),
    jumlah: angka(formData.get("jumlah")),
    nama_penerima: teks(formData.get("nama_penerima")),
    no_telp_penerima: teks(formData.get("no_telp_penerima")),
    metode: teks(formData.get("metode")) === "ambil" ? "ambil" : "kirim",
    tanggal_kirim: teks(formData.get("tanggal_kirim")),
    slot_kirim: teks(formData.get("slot_kirim")),
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  const d = hasil.data;

  const addons: { id_addon: number; jumlah: number }[] = [];
  for (const [kunci, nilai] of formData.entries()) {
    if (!kunci.startsWith("addon_")) continue;
    const qty = angka(nilai);
    const idAddon = idDari(kunci.slice(6));
    if (idAddon && Number.isFinite(qty) && qty > 0) addons.push({ id_addon: idAddon, jumlah: Math.min(qty, 99) });
  }

  const idZona = idDari(formData.get("id_zona"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buat_pesanan_custom", {
    p_id_user: d.id_user,
    p_nama_item: d.nama_item,
    p_deskripsi: d.deskripsi || null,
    p_harga: d.harga,
    p_jumlah: d.jumlah,
    p_addons: addons,
    p_ucapan: teks(formData.get("ucapan")).slice(0, 300) || null,
    p_nama_penerima: d.nama_penerima,
    p_no_telp_penerima: d.no_telp_penerima,
    p_metode: d.metode,
    p_id_zona: d.metode === "kirim" ? idZona : null,
    p_alamat: d.metode === "kirim" ? teks(formData.get("alamat")) : null,
    p_tanggal_kirim: d.tanggal_kirim,
    p_slot_kirim: d.slot_kirim,
    p_catatan: teks(formData.get("catatan")).slice(0, 500) || null,
  });
  if (error || !data) return { error: pesanDb(error, "Gagal membuat pesanan custom.") };

  segarkan();
  redirect(`/admin/pesanan/${(data as { kode_pesanan: string }).kode_pesanan}?baru=1`);
}

/* ---------------- Kategori ---------------- */

const skemaKategori = z.object({
  nama: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100),
  deskripsi: z.string().trim().max(500),
});

export async function simpanKategori(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const hasil = skemaKategori.safeParse({ nama: teks(formData.get("nama")), deskripsi: teks(formData.get("deskripsi")) });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  const id = idDari(formData.get("id_kategori"));
  const nilai = {
    nama_kategori: hasil.data.nama,
    slug: buatSlug(hasil.data.nama),
    deskripsi: hasil.data.deskripsi || null,
  };
  if (!nilai.slug) return { error: "Nama kategori tidak valid." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("kategori").update(nilai).eq("id_kategori", id)
    : await supabase.from("kategori").insert(nilai);
  if (error) {
    return { error: error.code === "23505" ? "Nama kategori sudah dipakai." : pesanDb(error, "Gagal menyimpan kategori.") };
  }
  segarkan();
  return { ok: id ? "Kategori diperbarui." : "Kategori ditambahkan." };
}

export async function hapusKategori(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const id = idDari(formData.get("id_kategori"));
  if (!id) return { error: "Kategori tidak valid." };
  const supabase = await createClient();
  const { count } = await supabase.from("produk").select("id_produk", { count: "exact", head: true }).eq("id_kategori", id);
  if ((count ?? 0) > 0) return { error: `Kategori masih dipakai ${count} produk. Pindahkan produknya dulu.` };
  const { error } = await supabase.from("kategori").delete().eq("id_kategori", id);
  if (error) return { error: pesanDb(error, "Gagal menghapus kategori.") };
  segarkan();
  return { ok: "Kategori dihapus." };
}

/* ---------------- Produk ---------------- */

const skemaProduk = z.object({
  nama_produk: z.string().trim().min(3, "Nama produk minimal 3 karakter").max(200),
  id_kategori: z.number({ error: "Pilih kategori" }).int().positive("Pilih kategori"),
  harga: nomor("Harga", 0, 1_000_000_000),
  stok_minimum: nomor("Stok minimum", 0, 9999),
  komposisi: z.string().trim().max(500),
  deskripsi: z.string().trim().max(3000),
});

export async function simpanProduk(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const hasil = skemaProduk.safeParse({
    nama_produk: teks(formData.get("nama_produk")),
    id_kategori: angka(formData.get("id_kategori")),
    harga: angka(formData.get("harga")),
    stok_minimum: angka(formData.get("stok_minimum")),
    komposisi: teks(formData.get("komposisi")),
    deskripsi: teks(formData.get("deskripsi")),
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  const d = hasil.data;
  const id = idDari(formData.get("id_produk"));
  const baru = id === null;
  const stokAwal = baru ? (teks(formData.get("stok_awal")) === "" ? 0 : angka(formData.get("stok_awal"))) : 0;
  if (!Number.isInteger(stokAwal) || stokAwal < 0 || stokAwal > 9999) return { error: "Stok awal harus 0–9999." };

  const gambar = await unggahGambar(formData.get("gambar"), "produk", d.nama_produk);
  if ("error" in gambar) return { error: gambar.error };

  const supabase = await createClient();
  const nilai: Record<string, unknown> = {
    nama_produk: d.nama_produk,
    id_kategori: d.id_kategori,
    harga: d.harga,
    stok_minimum: d.stok_minimum,
    komposisi: d.komposisi || null,
    deskripsi: d.deskripsi || null,
    is_aktif: centang(formData.get("is_aktif")),
    is_best_seller: centang(formData.get("is_best_seller")),
  };
  if (gambar.url) nilai.gambar = gambar.url;

  if (baru) {
    // Slug unik dijaga constraint database: kalau bentrok (termasuk dua admin menyimpan bersamaan), coba akhiran berikutnya.
    const slugDasar = buatSlug(d.nama_produk) || "produk";
    let data: { id_produk: number } | null = null;
    for (let i = 1; i <= 30 && !data; i++) {
      const slug = i === 1 ? slugDasar : `${slugDasar}-${i}`;
      const hasilInsert = await supabase.from("produk").insert({ ...nilai, slug }).select("id_produk").single();
      if (hasilInsert.error?.code === "23505") continue;
      if (hasilInsert.error || !hasilInsert.data) {
        if (gambar.url) await hapusGambarLama(gambar.url, "produk");
        return { error: pesanDb(hasilInsert.error, "Gagal menyimpan produk.") };
      }
      data = hasilInsert.data;
    }
    if (!data) return { error: "Nama produk ini sudah terlalu banyak dipakai. Gunakan nama lain." };
    if (stokAwal > 0) {
      const { error: errStok } = await supabase.rpc("sesuaikan_stok", {
        p_jenis: "produk",
        p_id: data.id_produk,
        p_delta: stokAwal,
        p_keterangan: "Stok awal",
      });
      if (errStok) return { error: `Produk tersimpan, tapi stok awal gagal dicatat (${pesanDb(errStok)}). Atur lewat menu Stok.` };
    }
    segarkan();
    redirect("/admin/produk?pesan=disimpan");
  }

  const { data: lama } = await supabase.from("produk").select("gambar").eq("id_produk", id).maybeSingle();
  const { error } = await supabase.from("produk").update(nilai).eq("id_produk", id);
  if (error) {
    if (gambar.url) await hapusGambarLama(gambar.url, "produk");
    return { error: pesanDb(error, "Gagal menyimpan produk.") };
  }
  if (gambar.url && lama?.gambar) await hapusGambarLama(lama.gambar, "produk");
  segarkan();
  redirect("/admin/produk?pesan=disimpan");
}

export async function hapusProduk(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const id = idDari(formData.get("id_produk"));
  if (!id) return { error: "Produk tidak valid." };
  const supabase = await createClient();
  const { count } = await supabase.from("detail_pesanan").select("id_detail", { count: "exact", head: true }).eq("id_produk", id);
  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("produk").update({ is_aktif: false }).eq("id_produk", id);
    if (error) return { error: pesanDb(error, "Gagal menonaktifkan produk.") };
    segarkan();
    return { ok: "Produk ini pernah dipesan, jadi dinonaktifkan (tidak dihapus) supaya riwayat pesanan tetap utuh." };
  }
  const { data: lama } = await supabase.from("produk").select("gambar").eq("id_produk", id).maybeSingle();
  const { error } = await supabase.from("produk").delete().eq("id_produk", id);
  if (error) return { error: pesanDb(error, "Gagal menghapus produk.") };
  await hapusGambarLama(lama?.gambar, "produk");
  segarkan();
  redirect("/admin/produk?pesan=dihapus");
}

/* ---------------- Addon ---------------- */

const skemaAddon = z.object({
  nama_addon: z.string().trim().min(2, "Nama addon minimal 2 karakter").max(100),
  harga: nomor("Harga", 0, 1_000_000_000),
  stok_minimum: nomor("Stok minimum", 0, 9999),
});

export async function simpanAddon(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const hasil = skemaAddon.safeParse({
    nama_addon: teks(formData.get("nama_addon")),
    harga: angka(formData.get("harga")),
    stok_minimum: angka(formData.get("stok_minimum")),
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  const id = idDari(formData.get("id_addon"));
  const stokAwal = id ? 0 : teks(formData.get("stok_awal")) === "" ? 0 : angka(formData.get("stok_awal"));
  if (!Number.isInteger(stokAwal) || stokAwal < 0 || stokAwal > 9999) return { error: "Stok awal harus 0–9999." };

  const gambar = await unggahGambar(formData.get("gambar"), "addon", hasil.data.nama_addon);
  if ("error" in gambar) return { error: gambar.error };

  const nilai: Record<string, unknown> = {
    ...hasil.data,
    is_aktif: centang(formData.get("is_aktif")),
    is_kartu_ucapan: centang(formData.get("is_kartu_ucapan")),
  };
  if (gambar.url) nilai.gambar = gambar.url;

  const supabase = await createClient();
  if (id) {
    const { data: lama } = await supabase.from("addon").select("gambar").eq("id_addon", id).maybeSingle();
    const { error } = await supabase.from("addon").update(nilai).eq("id_addon", id);
    if (error) {
      if (gambar.url) await hapusGambarLama(gambar.url, "addon");
      return { error: pesanDb(error, "Gagal menyimpan addon.") };
    }
    if (gambar.url && lama?.gambar) await hapusGambarLama(lama.gambar, "addon");
    segarkan();
    return { ok: "Addon diperbarui." };
  }

  const { data, error } = await supabase.from("addon").insert(nilai).select("id_addon").single();
  if (error || !data) {
    if (gambar.url) await hapusGambarLama(gambar.url, "addon");
    return { error: pesanDb(error, "Gagal menyimpan addon.") };
  }
  if (stokAwal > 0) {
    const { error: errStok } = await supabase.rpc("sesuaikan_stok", {
      p_jenis: "addon",
      p_id: data.id_addon,
      p_delta: stokAwal,
      p_keterangan: "Stok awal",
    });
    if (errStok) return { error: `Addon tersimpan, tapi stok awal gagal dicatat (${pesanDb(errStok)}). Atur lewat menu Stok.` };
  }
  segarkan();
  return { ok: "Addon ditambahkan." };
}

export async function hapusAddon(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const id = idDari(formData.get("id_addon"));
  if (!id) return { error: "Addon tidak valid." };
  const supabase = await createClient();
  const { count } = await supabase.from("detail_addon").select("id_detail_addon", { count: "exact", head: true }).eq("id_addon", id);
  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("addon").update({ is_aktif: false }).eq("id_addon", id);
    if (error) return { error: pesanDb(error, "Gagal menonaktifkan addon.") };
    segarkan();
    return { ok: "Addon ini pernah dipesan, jadi dinonaktifkan (tidak dihapus)." };
  }
  const { data: lama } = await supabase.from("addon").select("gambar").eq("id_addon", id).maybeSingle();
  const { error } = await supabase.from("addon").delete().eq("id_addon", id);
  if (error) return { error: pesanDb(error, "Gagal menghapus addon.") };
  await hapusGambarLama(lama?.gambar, "addon");
  segarkan();
  return { ok: "Addon dihapus." };
}

/* ---------------- Stok ---------------- */

export async function sesuaikanStok(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const jenis = teks(formData.get("jenis"));
  const id = idDari(formData.get("id"));
  if ((jenis !== "produk" && jenis !== "addon") || !id) return { error: "Barang tidak valid." };
  const arah = teks(formData.get("arah")) === "kurang" ? -1 : 1;
  const jumlah = angka(formData.get("jumlah"));
  if (!Number.isFinite(jumlah) || jumlah <= 0 || jumlah > 9999) return { error: "Jumlah harus antara 1 dan 9999." };
  const keterangan = teks(formData.get("keterangan")).slice(0, 200);
  if (!keterangan) return { error: "Keterangan wajib diisi, misalnya \"restock\" atau \"bunga layu\"." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sesuaikan_stok", {
    p_jenis: jenis,
    p_id: id,
    p_delta: arah * jumlah,
    p_keterangan: keterangan,
  });
  if (error) return { error: pesanDb(error, "Gagal menyesuaikan stok.") };
  segarkan();
  return { ok: `Stok sekarang ${data}.` };
}

/* ---------------- Pengaturan toko ---------------- */

const skemaToko = z.object({
  nama_toko: z.string().trim().min(2, "Nama toko wajib diisi").max(100),
  deskripsi: z.string().trim().max(500),
  email: z.union([z.literal(""), z.string().trim().email("Email toko tidak valid")]),
  no_whatsapp: z
    .string()
    .transform((v) => v.replace(/[\s\-+]/g, ""))
    .pipe(z.string().regex(/^(0|62)[0-9]{8,13}$/, "Nomor WhatsApp tidak valid (contoh: 6281234567890)")),
  alamat: z.string().trim().max(300),
  kota: z.string().trim().max(100),
  kode_pos: z.string().trim().max(10),
});

export async function simpanProfilToko(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const hasil = skemaToko.safeParse({
    nama_toko: teks(formData.get("nama_toko")),
    deskripsi: teks(formData.get("deskripsi")),
    email: teks(formData.get("email")),
    no_whatsapp: teks(formData.get("no_whatsapp")),
    alamat: teks(formData.get("alamat")),
    kota: teks(formData.get("kota")),
    kode_pos: teks(formData.get("kode_pos")),
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  const d = hasil.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("pengaturan_toko")
    .update({
      nama_toko: d.nama_toko,
      deskripsi: d.deskripsi || null,
      email: d.email || null,
      no_whatsapp: d.no_whatsapp.startsWith("0") ? "62" + d.no_whatsapp.slice(1) : d.no_whatsapp,
      alamat: d.alamat || null,
      kota: d.kota || null,
      kode_pos: d.kode_pos || null,
    })
    .eq("id", 1);
  if (error) return { error: pesanDb(error, "Gagal menyimpan. Coba lagi.") };
  segarkan();
  return { ok: "Profil toko tersimpan." };
}

const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function simpanOperasional(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();

  const jamOperasional: Record<string, { buka: string; tutup: string; libur: boolean }> = {};
  for (const hari of NAMA_HARI) {
    const libur = centang(formData.get(`${hari}_libur`));
    const buka = teks(formData.get(`${hari}_buka`)) || "09:00";
    const tutup = teks(formData.get(`${hari}_tutup`)) || "18:00";
    if (!JAM.test(buka) || !JAM.test(tutup)) return { error: `Format jam hari ${hari} tidak valid.` };
    if (!libur && buka >= tutup) return { error: `Jam tutup hari ${hari} harus setelah jam buka.` };
    jamOperasional[hari] = { buka, tutup, libur };
  }

  const slot: { mulai: string; selesai: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const mulai = teks(formData.get(`slot_${i}_mulai`));
    const selesai = teks(formData.get(`slot_${i}_selesai`));
    if (!mulai && !selesai) continue;
    if (!JAM.test(mulai) || !JAM.test(selesai) || mulai >= selesai) {
      return { error: `Slot ke-${i + 1} tidak valid. Jam selesai harus setelah jam mulai.` };
    }
    slot.push({ mulai, selesai });
  }
  if (slot.length === 0) return { error: "Minimal harus ada satu slot kirim." };
  slot.sort((a, b) => a.mulai.localeCompare(b.mulai));

  const cutoff = teks(formData.get("jam_cutoff"));
  if (!JAM.test(cutoff)) return { error: "Jam cut-off tidak valid." };
  const batas = angka(formData.get("batas_bayar_menit"));
  if (!Number.isFinite(batas) || batas < 5 || batas > 60) return { error: "Batas waktu bayar harus 5–60 menit." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pengaturan_toko")
    .update({
      is_buka: centang(formData.get("is_buka")),
      terima_preorder: centang(formData.get("terima_preorder")),
      jam_operasional: jamOperasional,
      slot_kirim: slot,
      jam_cutoff: cutoff,
      batas_bayar_menit: batas,
    })
    .eq("id", 1);
  if (error) return { error: pesanDb(error, "Gagal menyimpan. Coba lagi.") };
  segarkan();
  return { ok: "Pengaturan operasional tersimpan." };
}

export async function simpanTemplateEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const template = {
    pembayaran_berhasil: {
      subjek: teks(formData.get("pembayaran_berhasil_subjek")).slice(0, 150),
      isi: String(formData.get("pembayaran_berhasil_isi") ?? "").trim().slice(0, 3000),
    },
    orderan_masuk: {
      subjek: teks(formData.get("orderan_masuk_subjek")).slice(0, 150),
      isi: String(formData.get("orderan_masuk_isi") ?? "").trim().slice(0, 3000),
    },
  };
  if (!template.pembayaran_berhasil.subjek || !template.pembayaran_berhasil.isi || !template.orderan_masuk.subjek || !template.orderan_masuk.isi) {
    return { error: "Subjek dan isi kedua template wajib diisi." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pengaturan_toko").update({ template_email: template }).eq("id", 1);
  if (error) return { error: pesanDb(error, "Gagal menyimpan. Coba lagi.") };
  segarkan();
  return { ok: "Template email tersimpan." };
}

const skemaZona = z.object({
  nama_zona: z.string().trim().min(2, "Nama area minimal 2 karakter").max(100),
  tarif: nomor("Tarif", 0, 10_000_000),
  urutan: nomor("Urutan", 0, 999),
});

export async function simpanZona(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const hasil = skemaZona.safeParse({
    nama_zona: teks(formData.get("nama_zona")),
    tarif: angka(formData.get("tarif")),
    urutan: Number.isFinite(angka(formData.get("urutan"))) ? angka(formData.get("urutan")) : 0,
  });
  if (!hasil.success) return { error: hasil.error.issues[0].message };
  const id = idDari(formData.get("id_zona"));
  const nilai = { ...hasil.data, is_aktif: centang(formData.get("is_aktif")) };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("zona_pengiriman").update(nilai).eq("id_zona", id)
    : await supabase.from("zona_pengiriman").insert(nilai);
  if (error) return { error: pesanDb(error, "Gagal menyimpan. Coba lagi.") };
  segarkan();
  return { ok: id ? "Area diperbarui." : "Area ditambahkan." };
}

export async function hapusZona(_prev: FormState, formData: FormData): Promise<FormState> {
  await wajibAdmin();
  const id = idDari(formData.get("id_zona"));
  if (!id) return { error: "Area tidak valid." };
  const supabase = await createClient();
  const { count } = await supabase.from("pesanan").select("id_pesanan", { count: "exact", head: true }).eq("id_zona", id);
  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("zona_pengiriman").update({ is_aktif: false }).eq("id_zona", id);
    if (error) return { error: pesanDb(error, "Gagal menonaktifkan area.") };
    segarkan();
    return { ok: "Area ini pernah dipakai pesanan, jadi dinonaktifkan (tidak dihapus)." };
  }
  const { error } = await supabase.from("zona_pengiriman").delete().eq("id_zona", id);
  if (error) return { error: pesanDb(error, "Gagal menghapus area.") };
  segarkan();
  return { ok: "Area dihapus." };
}

/* ---------------- Notifikasi admin ---------------- */

export async function tandaiNotifAdminDibaca(): Promise<void> {
  const profil = await wajibAdmin();
  const supabase = await createClient();
  await supabase.from("notifikasi").update({ is_dibaca: true }).eq("id_user", profil.id).eq("is_dibaca", false);
  segarkan();
}
