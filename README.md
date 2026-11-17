# Blossomé — Website Florist (Next.js + Supabase)

Website florist dengan katalog, keranjang, checkout, pembayaran **QRIS Midtrans (sandbox)**, notifikasi web + email, dan admin panel.

- **Frontend & backend:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **Database, auth, storage, realtime:** Supabase (project `blossome`, region Singapura)
- **Pembayaran:** Midtrans Core API, QRIS dinamis
- **Email:** Nodemailer (SMTP, mis. Gmail)

Database sudah disiapkan. Semua migrasi di `supabase/migrations` sudah dijalankan ke project Supabase `blossome`.

---

## 1. Jalankan di komputer

Butuh **Node.js 20 atau lebih baru**.

```bash
cd blossome
copy .env.example .env.local
npm install
npm run dev
```

Buka http://localhost:3000.

> Folder `node_modules` sengaja tidak ikut disalin. Jalankan `npm install` sekali di komputermu.

## 2. Lengkapi `.env.local`

`.env.local` dibuat dari `.env.example` (perintah `copy` di atas). URL dan publishable key Supabase sudah terisi. Masih ada dua yang **wajib** kamu isi:

| Variabel | Ambil dari |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API Keys → **secret key** (`sb_secret_...`) atau `service_role` |
| `MIDTRANS_SERVER_KEY` | https://dashboard.sandbox.midtrans.com → Settings → Access Keys → **Server Key** (`SB-Mid-server-...`) |

Opsional (untuk email "pembayaran berhasil" dan "orderan masuk"):

| Variabel | Contoh Gmail |
| --- | --- |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465` |
| `SMTP_USER` | alamat Gmail kamu |
| `SMTP_PASS` | **App Password** Gmail (Google Account → Security → App passwords), bukan password biasa |
| `EMAIL_FROM` | `"Blossomé <alamat@gmail.com>"` |

Kalau SMTP kosong, website tetap jalan. Email saja yang tidak terkirim.

Setelah mengubah `.env.local`, hentikan lalu jalankan ulang `npm run dev`.

## 3. Atur Supabase Auth (sekali saja, di dashboard)

Buka https://supabase.com/dashboard/project/sjfxnamddrbfawvpcysj

1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (ganti ke URL Vercel setelah deploy)
   - Redirect URLs: tambahkan `http://localhost:3000/**` (dan nanti `https://NAMA-PROJEK.vercel.app/**`)
2. **Authentication → Emails → SMTP Settings**: nyalakan *Enable Custom SMTP*, isi dengan Gmail + App Password yang sama seperti di `.env.local`.
   Tanpa ini, Supabase hanya mengirim beberapa email per jam dan template email tidak bisa diubah.
3. **Authentication → Emails → Templates**. Supaya email berisi **kode OTP 6 digit**:
   - *Confirm signup*: tambahkan `<p>Kode verifikasi: <b>{{ .Token }}</b></p>`
   - *Reset password*: tambahkan `<p>Kode reset password: <b>{{ .Token }}</b></p>`
4. **Login Google (opsional)**: Authentication → Sign In / Providers → Google. Isi Client ID dan Secret dari Google Cloud Console.
   Authorized redirect URI di Google: `https://sjfxnamddrbfawvpcysj.supabase.co/auth/v1/callback`
5. *Leaked password protection* (menolak password yang pernah bocor) hanya tersedia di paket **Pro** Supabase. Di paket gratis lewati saja; peringatan "Leaked Password Protection Disabled" di Security Advisor boleh diabaikan.

## 4. Buat akun admin

Admin tidak bisa daftar dari website.

1. Daftar akun biasa di `/daftar` atau lewat Google (pakai email yang akan jadi admin).
2. Supabase Dashboard → SQL Editor, jalankan:

   ```sql
   update public.profiles set role = 'admin' where email = 'email-admin@contoh.com';
   ```

3. Masuk di `/admin/masuk` (email + password, atau tombol **Masuk dengan Google** untuk akun Google).
   Akun Google bisa membuat password di menu **Akun Saya** di admin panel.
4. Buka **Pengaturan Toko**, lalu isi **email toko** (penerima email orderan masuk) dan nomor WhatsApp.

Akun admin **tidak bisa berbelanja**: semua halaman toko (beranda, katalog, keranjang, checkout, dll.) langsung
diarahkan ke dashboard, dan database menolak keranjang/pesanan katalog milik admin. Untuk mencoba toko sebagai
pembeli, pakai akun pelanggan lain (atau jendela penyamaran/incognito).

## 5. Uji pembayaran QRIS (sandbox)

1. Login sebagai customer → pilih produk → keranjang → checkout → **Bayar dengan QRIS**.
2. Di halaman pembayaran, klik **Salin URL QR** lalu **Buka simulator QRIS**.
3. Tempel URL di simulator, lalu bayar.
4. Status berubah jadi **Diproses** dengan salah satu cara:
   - otomatis lewat webhook (butuh URL publik, lihat langkah 6), atau
   - klik **Saya sudah bayar, cek status**. Cara ini bekerja juga di `localhost` tanpa webhook.

> Jangan pernah membayar QR sandbox dengan uang asli.

## 6. Deploy ke Vercel

1. Upload folder ini ke repository GitHub. File `.env.local` otomatis tidak ikut. Kalau belum ada git:

   ```bash
   git init
   git add .
   git commit -m "Website Blossomé"
   ```

   Lalu buat repository baru di GitHub dan ikuti perintah `git remote add` + `git push` yang ditampilkan GitHub.
2. https://vercel.com/new → import repository.
3. Di **Environment Variables**, masukkan semua isi `.env.local`. Ganti `NEXT_PUBLIC_SITE_URL` dengan `https://NAMA-PROJEK.vercel.app`.
4. Deploy. Server Vercel otomatis berjalan di **Singapura** (`vercel.json` → `"regions": ["sin1"]`), satu wilayah dengan database Supabase, jadi halaman lebih cepat.
5. Setelah online:
   - Supabase → Authentication → URL Configuration: ganti Site URL ke URL Vercel dan tambahkan `https://NAMA-PROJEK.vercel.app/**` di Redirect URLs.
   - Google Cloud → Google Auth Platform → Clients → client web: tambahkan `https://NAMA-PROJEK.vercel.app` di Authorized JavaScript origins.
   - Midtrans sandbox → Settings → Payment → Notification URL → **Payment Notification URL**: `https://NAMA-PROJEK.vercel.app/api/midtrans/webhook`
   - Cek di Admin → Pengaturan Toko: bagian Pembayaran harus menunjukkan semua kunci "sudah diisi".
   - Kalau `NEXT_PUBLIC_SITE_URL` diubah setelah deploy, lakukan **Redeploy** supaya nilainya terpakai.

## Struktur folder

```
src/
  app/
    (toko)/        halaman customer: beranda, katalog, produk, keranjang, checkout, pesanan, notifikasi, akun
    (auth)/        daftar, masuk, verifikasi OTP, lupa password
    admin/         admin panel (dashboard, pesanan, produk, kategori, addon, stok, pelanggan, laporan, pengaturan)
    api/midtrans/  webhook pembayaran
  components/      komponen UI (toko, admin, pesanan, auth)
  lib/             koneksi Supabase, server actions, Midtrans, email, format
  proxy.ts         penjaga sesi & halaman yang butuh login
supabase/migrations/  skema database (sudah dijalankan)
```

## Aturan bisnis utama (ada di database)

- **Checkout** (`buat_pesanan`): harga dihitung ulang dari database, stok dikunci dan dikurangi dalam satu transaksi, ongkir mengikuti zona, jadwal divalidasi (cut-off, jam operasional, slot).
- **Status:** Belum Dibayar → Diproses (hanya lewat pembayaran) → Dikirim / Siap Diambil (sesuai metode) → Selesai. Dibatalkan mengembalikan stok.
- **Kedaluwarsa:** pesanan yang lewat batas bayar dibatalkan oleh webhook `expire` atau oleh cron database setiap 5 menit.
- **Keamanan:** RLS aktif di semua tabel. Customer hanya bisa melihat datanya sendiri, dan perubahan pesanan hanya lewat fungsi database.
- **Stok** hanya bisa berubah lewat fungsi database (checkout, pembatalan, menu Stok), jadi semua perubahan tercatat di `log_stok`. Kolom `stok` tidak bisa diubah langsung, termasuk oleh admin.
- **Anti race condition:** checkout memakai kunci per pelanggan (klik ganda tidak membuat pesanan dobel/kosong), keranjang terkunci selama checkout, dan pembuatan QRIS "memesan" nomor transaksi dulu sebelum memanggil Midtrans. Webhook dan pembatalan mengunci baris dengan urutan yang sama (pesanan → pembayaran) supaya tidak deadlock.
- **Batas wajar:** maksimal 3 pesanan belum dibayar dan 10 pesanan per jam per pelanggan, serta 30 item di keranjang, supaya stok tidak "ditahan" atau diputar-putar.
- **Batas isian:** panjang alamat, catatan, ucapan, dan deskripsi dibatasi juga di database, dan format nomor telepon dicek di database.
- **Pembayaran telat:** kalau QRIS dibayar setelah pesanan batal, admin mendapat notifikasi "Perlu ditinjau" untuk refund manual.
- **Cache katalog:** data katalog di-cache di server maks. 60 detik dan langsung dibersihkan saat admin mengubah data atau stok berubah. Stok selalu dicek ulang oleh database saat checkout.
