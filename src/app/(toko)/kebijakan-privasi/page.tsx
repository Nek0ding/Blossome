import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getPengaturan } from "@/lib/toko";
import { linkWa } from "@/lib/format";

/** Ubah tanggal ini setiap kali isi kebijakan diubah. */
const TERAKHIR_DIPERBARUI = "17 November 2026";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang dikumpulkan Blossomé, untuk apa dipakai, siapa yang ikut memprosesnya, dan hak kamu atas data tersebut.",
  alternates: { canonical: "/kebijakan-privasi" },
};

const DAFTAR_ISI = [
  { id: "ringkasan", judul: "Ringkasan" },
  { id: "data", judul: "Data yang kami kumpulkan" },
  { id: "kegunaan", judul: "Untuk apa data dipakai" },
  { id: "pihak-lain", judul: "Layanan pihak ketiga" },
  { id: "cookie", judul: "Cookie" },
  { id: "keamanan", judul: "Keamanan data" },
  { id: "penyimpanan", judul: "Berapa lama data disimpan" },
  { id: "hak", judul: "Hak kamu" },
  { id: "perubahan", judul: "Perubahan kebijakan" },
  { id: "kontak", judul: "Hubungi kami" },
] as const;

function Bagian({ id, judul, children }: { id: string; judul: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="scroll-mt-28">
      <h2 id={`${id}-judul`} className="font-serif text-3xl font-bold italic text-rose">
        {judul}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-tinta/90">{children}</div>
    </section>
  );
}

function Daftar({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-pink">{children}</ul>;
}

export default async function HalamanKebijakanPrivasi() {
  const toko = await getPengaturan();
  const alamatToko = [toko.alamat, toko.kota, toko.kode_pos].filter(Boolean).join(", ");

  return (
    <div className="px-4 py-12 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <header>
          <h1 className="judul text-5xl sm:text-6xl">Kebijakan Privasi</h1>
          <p className="mt-3 text-sm text-abu">Terakhir diperbarui: {TERAKHIR_DIPERBARUI}</p>
          <p className="mt-6 leading-relaxed text-tinta/90">
            Kebijakan ini menjelaskan bagaimana {toko.nama_toko} (&quot;kami&quot;) mengumpulkan, memakai, dan menjaga data
            pribadimu saat kamu memakai website ini untuk melihat katalog, membuat akun, memesan, dan membayar.
          </p>
        </header>

        <nav aria-label="Daftar isi" className="mt-8 rounded-2xl border border-garis bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold text-zaitun-tua">Daftar isi</p>
          <ol className="mt-3 grid list-decimal gap-x-8 gap-y-1.5 pl-5 text-sm sm:grid-cols-2">
            {DAFTAR_ISI.map((b) => (
              <li key={b.id}>
                <a href={`#${b.id}`} className="text-rose hover:underline">
                  {b.judul}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          <Bagian id="ringkasan" judul="Ringkasan">
            <Daftar>
              <li>Kami hanya meminta data yang diperlukan untuk memproses dan mengantar pesananmu.</li>
              <li>Kami tidak menjual datamu dan tidak memakainya untuk iklan.</li>
              <li>
                Pembayaran QRIS diproses oleh Midtrans. Kami tidak menerima maupun menyimpan PIN, saldo, atau data rekening
                bank dan e-wallet kamu.
              </li>
              <li>Kamu bisa melihat dan mengubah data profil kapan saja di halaman Akun.</li>
            </Daftar>
          </Bagian>

          <Bagian id="data" judul="Data yang kami kumpulkan">
            <p className="font-semibold">Saat membuat akun</p>
            <Daftar>
              <li>Nama dan alamat email.</li>
              <li>
                Password. Password disimpan oleh layanan login kami dalam bentuk terenkripsi satu arah (hash), sehingga kami
                pun tidak bisa melihatnya.
              </li>
              <li>Nomor telepon dan alamat, kalau kamu mengisinya di halaman Akun.</li>
            </Daftar>

            <p className="font-semibold">Saat masuk dengan Google</p>
            <Daftar>
              <li>
                Nama, alamat email, dan foto profil dari akun Google-mu. Kami tidak pernah menerima password Google-mu.
              </li>
            </Daftar>

            <p className="font-semibold">Saat memesan</p>
            <Daftar>
              <li>Nama dan nomor telepon penerima.</li>
              <li>Alamat dan area pengiriman (kalau memilih dikirim), tanggal, dan slot waktu.</li>
              <li>Catatan pesanan dan isi kartu ucapan (kalau kamu menambahkan Kartu Ucapan).</li>
              <li>Produk, addon, jumlah, ongkir, dan total harga.</li>
            </Daftar>

            <p className="font-semibold">Saat membayar</p>
            <Daftar>
              <li>Kode transaksi, nominal, status pembayaran, dan waktu pembayaran yang dikirim oleh Midtrans.</li>
            </Daftar>

            <p className="font-semibold">Data teknis</p>
            <Daftar>
              <li>Cookie sesi supaya kamu tetap masuk (lihat bagian Cookie).</li>
              <li>
                Catatan teknis seperti alamat IP dan waktu akses yang dicatat otomatis oleh penyedia layanan kami untuk
                keamanan dan pemantauan gangguan.
              </li>
            </Daftar>
          </Bagian>

          <Bagian id="kegunaan" judul="Untuk apa data dipakai">
            <Daftar>
              <li>Membuat dan mengelola akunmu, termasuk verifikasi email dan reset password.</li>
              <li>Memproses pesanan, menyiapkan buket, dan mengantarnya atau menyiapkannya untuk diambil.</li>
              <li>Membuat tagihan QRIS dan memastikan pembayaran sudah diterima.</li>
              <li>
                Mengirim pemberitahuan tentang pesananmu, misalnya email saat pembayaran berhasil dan notifikasi saat
                status pesanan berubah.
              </li>
              <li>Menghubungimu kalau ada kendala dengan pesanan.</li>
              <li>Membuat laporan penjualan untuk keperluan internal toko.</li>
              <li>Menjaga keamanan website dan mencegah penyalahgunaan, misalnya pesanan palsu berulang.</li>
            </Daftar>
            <p>Kami tidak mengirim promosi lewat email tanpa persetujuanmu.</p>
          </Bagian>

          <Bagian id="pihak-lain" judul="Layanan pihak ketiga">
            <p>
              Untuk menjalankan website, sebagian data diproses oleh penyedia layanan berikut. Mereka hanya menerima data
              yang diperlukan untuk tugasnya masing-masing:
            </p>
            <Daftar>
              <li>
                <span className="font-semibold">Supabase</span>: database, login akun, dan penyimpanan foto produk. Server
                yang kami pakai berada di Singapura.
              </li>
              <li>
                <span className="font-semibold">Midtrans</span>: memproses pembayaran QRIS. Midtrans menerima kode pesanan,
                nominal, serta nama dan email akunmu.
              </li>
              <li>
                <span className="font-semibold">Google</span>: hanya kalau kamu memilih masuk dengan Google.
              </li>
              <li>
                <span className="font-semibold">Layanan email (SMTP)</span>: mengirim email verifikasi dan pemberitahuan
                pesanan.
              </li>
              <li>
                <span className="font-semibold">Penyedia hosting website</span>: menjalankan website ini.
              </li>
            </Daftar>
            <p>
              Kalau kamu menghubungi kami lewat WhatsApp, percakapan tersebut juga mengikuti kebijakan privasi WhatsApp.
              Selain untuk keperluan di atas atau karena diwajibkan hukum, kami tidak membagikan datamu kepada pihak lain.
            </p>
          </Bagian>

          <Bagian id="cookie" judul="Cookie">
            <p>
              Kami hanya memakai cookie yang dibutuhkan agar website berfungsi, yaitu cookie sesi login dari layanan login
              kami. Tanpa cookie ini kamu tidak bisa masuk ke akun.
            </p>
            <p>Kami tidak memakai cookie iklan maupun cookie pelacak pihak ketiga.</p>
          </Bagian>

          <Bagian id="keamanan" judul="Keamanan data">
            <Daftar>
              <li>Koneksi ke website dienkripsi dengan HTTPS.</li>
              <li>
                Database membatasi akses per pengguna: kamu hanya bisa melihat akun, keranjang, dan pesananmu sendiri.
              </li>
              <li>Selain kamu sendiri, data pesananmu hanya bisa dibuka oleh admin toko.</li>
              <li>Kunci rahasia layanan pembayaran dan database hanya disimpan di server, tidak pernah dikirim ke browser.</li>
            </Daftar>
            <p>
              Tidak ada sistem yang 100% aman. Kalau kamu menemukan celah keamanan atau curiga akunmu disalahgunakan,
              segera hubungi kami dan ganti password-mu.
            </p>
          </Bagian>

          <Bagian id="penyimpanan" judul="Berapa lama data disimpan">
            <Daftar>
              <li>Data akun disimpan selama akunmu masih ada.</li>
              <li>Isi keranjang dihapus otomatis setelah kamu checkout.</li>
              <li>
                Data pesanan dan pembayaran disimpan untuk riwayat pesananmu dan pencatatan penjualan toko, termasuk setelah
                pesanan selesai atau dibatalkan.
              </li>
            </Daftar>
          </Bagian>

          <Bagian id="hak" judul="Hak kamu">
            <p>Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, kamu berhak untuk:</p>
            <Daftar>
              <li>
                Melihat dan memperbarui data profil di halaman{" "}
                <Link href="/akun" className="text-rose hover:underline">
                  Akun
                </Link>{" "}
                serta melihat riwayat pesanan di halaman{" "}
                <Link href="/pesanan" className="text-rose hover:underline">
                  Pesanan Saya
                </Link>
                .
              </li>
              <li>Meminta salinan data pribadimu yang kami simpan.</li>
              <li>Meminta perbaikan data yang tidak akurat.</li>
              <li>
                Meminta akunmu dihapus. Data transaksi yang masih dibutuhkan untuk pencatatan penjualan dapat tetap kami
                simpan.
              </li>
              <li>
                Mencabut akses Blossomé ke akun Google-mu kapan saja melalui{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  className="text-rose hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pengaturan akun Google
                </a>
                .
              </li>
            </Daftar>
            <p>
              Untuk permintaan selain mengubah profil, hubungi kami lewat kontak di bawah. Kami bisa meminta konfirmasi dari
              email akunmu untuk memastikan permintaan benar-benar datang dari pemilik akun.
            </p>
          </Bagian>

          <Bagian id="perubahan" judul="Perubahan kebijakan">
            <p>
              Kami dapat memperbarui kebijakan ini, misalnya saat menambah fitur atau layanan baru. Tanggal &quot;Terakhir
              diperbarui&quot; di atas akan ikut berubah. Kalau perubahannya penting, kami akan berusaha memberi tahu
              lewat website atau email.
            </p>
          </Bagian>

          <Bagian id="kontak" judul="Hubungi kami">
            <p>Punya pertanyaan atau permintaan tentang data pribadimu? Hubungi {toko.nama_toko}:</p>
            <ul className="space-y-1.5">
              {toko.email ? (
                <li>
                  Email:{" "}
                  <a href={`mailto:${toko.email}`} className="text-rose hover:underline">
                    {toko.email}
                  </a>
                </li>
              ) : null}
              {toko.no_whatsapp ? (
                <li>
                  WhatsApp:{" "}
                  <a
                    href={linkWa(toko.no_whatsapp, `Halo ${toko.nama_toko}, saya ingin bertanya tentang data pribadi saya.`)}
                    className="text-rose hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    +{toko.no_whatsapp}
                  </a>
                </li>
              ) : null}
              {alamatToko ? <li>Alamat: {alamatToko}</li> : null}
              {!toko.email && !toko.no_whatsapp && !alamatToko ? (
                <li>
                  Lewat bagian{" "}
                  <Link href="/#kontak" className="text-rose hover:underline">
                    Contact Us
                  </Link>{" "}
                  di halaman utama.
                </li>
              ) : null}
            </ul>
          </Bagian>
        </div>
      </article>
    </div>
  );
}
