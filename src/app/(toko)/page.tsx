import Link from "next/link";
import { Clock, Flower2, HandHeart, MapPin, MessageCircle, QrCode, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { KartuProduk } from "@/components/toko/kartu-produk";
import { kelasTombol } from "@/components/ui";
import { getKategori, getProdukAktif, getZonaAktif } from "@/lib/data";
import { getPengaturan } from "@/lib/toko";
import { NAMA_HARI } from "@/lib/types";
import { linkWa, rupiah } from "@/lib/format";

const JANJI = [
  {
    ikon: Flower2,
    judul: "High-Quality Fresh Flowers",
    isi: "Setiap rangkaian dibuat dari bunga pilihan supaya cantik dan segar lebih lama.",
  },
  {
    ikon: HandHeart,
    judul: "Affordable Flowers",
    isi: "Pilihan buket untuk berbagai budget tanpa mengurangi sentuhan personal dan kualitasnya.",
  },
  {
    ikon: Clock,
    judul: "Same Day Order",
    isi: "Pesan sebelum jam cut-off, buketmu bisa dikirim di hari yang sama.",
  },
];

const LANGKAH = [
  { ikon: ShoppingBag, judul: "Pilih Buket", isi: "Pilih buket dari katalog dan tambahkan addon seperti kartu ucapan atau coklat." },
  { ikon: Clock, judul: "Atur Jadwal", isi: "Isi data penerima, pilih dikirim atau ambil di toko, lalu pilih tanggal dan jam." },
  { ikon: QrCode, judul: "Bayar QRIS", isi: "Scan QRIS sesuai total belanja dari aplikasi e-wallet atau mobile banking." },
  { ikon: Truck, judul: "Buket Sampai", isi: "Kami rangkai buketmu, lalu antar ke penerima atau siapkan untuk diambil." },
];

const FAQ = [
  {
    t: "Apakah bisa pesan untuk hari ini?",
    j: "Bisa. Pesanan untuk hari yang sama diterima sampai jam cut-off yang tertera di bagian atas halaman, selama toko buka.",
  },
  {
    t: "Pembayarannya pakai apa?",
    j: "Semua pembayaran memakai QRIS. Kamu bisa scan dari GoPay, OVO, DANA, ShopeePay, atau aplikasi mobile banking. Status pesanan berubah otomatis setelah pembayaran diterima.",
  },
  {
    t: "Berapa lama batas waktu pembayaran?",
    j: "QRIS berlaku sesuai batas waktu yang tampil di halaman pembayaran. Kalau lewat, pesanan otomatis dibatalkan dan kamu bisa memesan ulang.",
  },
  {
    t: "Bisa request desain buket sendiri?",
    j: "Bisa. Untuk ganti kertas, bunga, atau desain di luar katalog, hubungi admin lewat WhatsApp. Setelah deal, admin mengirim link pembayaran QRIS ke akunmu.",
  },
  {
    t: "Bagaimana kalau alamat saya di luar area pengiriman?",
    j: "Saat ini kami hanya melayani area yang tercantum di halaman checkout. Untuk alamat di luar area, hubungi kami lewat WhatsApp atau pilih ambil di toko.",
  },
];

export default async function Beranda() {
  const [toko, bestSeller, kategori, zona, katalog] = await Promise.all([
    getPengaturan(),
    getProdukAktif({ bestSeller: true, limit: 6 }),
    getKategori(),
    getZonaAktif(),
    getProdukAktif({ limit: 6 }),
  ]);
  const waCustom = linkWa(toko.no_whatsapp, `Halo ${toko.nama_toko}, saya mau pesan custom bouquet.`);

  return (
    <>
      {/* Hero */}
      <section className="px-4 pt-6 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-linear-to-br from-[#7d4a5c] via-[#b4456b] to-[#6f7b4b] px-6 py-16 text-center text-white sm:py-24">
          <div className="motif-bunga absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative">
            <p className="font-serif text-3xl italic sm:text-4xl">Welcome To</p>
            <h1 className="mt-3 font-script text-7xl leading-none sm:text-8xl">{toko.nama_toko}</h1>
            <p className="mt-4 font-serif text-2xl italic tracking-wide sm:text-3xl">FLORIST &amp; BOUQUET DEPOK</p>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
              Buket bunga segar dan artifisial, rangkaian wisuda, dan hadiah custom yang dirangkai dengan hati di Depok.
            </p>
            <Link href="/katalog" className={kelasTombol("utama", false, "mt-8 bg-white/10 px-8 py-3 ring-1 ring-white/40")}>
              Order Now
            </Link>
          </div>
        </div>
      </section>

      {/* Janji */}
      <section id="tentang" className="motif-bunga px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="judul text-5xl">Our Promise</h2>
          <p className="mx-auto mt-3 max-w-2xl text-abu">
            Bunga segar, rangkaian yang rapi, dan layanan yang hangat untuk setiap momen spesialmu.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {JANJI.map(({ ikon: Ikon, judul, isi }) => (
              <div key={judul} className="rounded-2xl border border-zaitun-muda bg-sage-muda p-6">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-rose">
                  <Ikon size={22} aria-hidden />
                </span>
                <h3 className="mt-4 font-serif text-2xl font-bold italic text-tinta">{judul}</h3>
                <p className="mt-2 text-sm text-abu">{isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best seller */}
      {bestSeller.length > 0 ? (
        <section className="bg-pink-muda px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="judul text-5xl">Our Best Seller !</h2>
              <p className="mx-auto mt-3 max-w-2xl text-abu">
                Rangkaian favorit pelanggan kami untuk merayakan berbagai momen bahagia.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {bestSeller.map((p, i) => (
                <KartuProduk key={p.id_produk} produk={p} urutan={i} saatGulir />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Cara pesan */}
      <section id="cara-pesan" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="judul text-5xl">How To Order</h2>
          <p className="mx-auto mt-3 max-w-2xl text-abu">Empat langkah mudah dari katalog sampai buket diterima.</p>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map(({ ikon: Ikon, judul, isi }, i) => (
              <li key={judul} className="rounded-2xl border border-garis bg-white p-6 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-zaitun-tua">
                    <Ikon size={20} aria-hidden />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-abu">Langkah {i + 1}</span>
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold italic text-tinta">{judul}</h3>
                <p className="mt-2 text-sm text-abu">{isi}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Katalog */}
      <section className="bg-sage-muda px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="judul text-5xl">Our Catalog</h2>
          <p className="mx-auto mt-3 max-w-2xl text-abu">
            Jelajahi koleksi buket segar, bloom box, dan rangkaian bunga lainnya.
          </p>
          <nav aria-label="Kategori" className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/katalog" className="rounded-full bg-zaitun px-4 py-1.5 text-sm font-semibold text-white">
              Semua
            </Link>
            {kategori.map((k) => (
              <Link
                key={k.id_kategori}
                href={`/katalog?kategori=${k.slug}`}
                className="rounded-full border border-garis bg-white px-4 py-1.5 text-sm font-medium text-zaitun-tua hover:border-zaitun"
              >
                {k.nama_kategori}
              </Link>
            ))}
          </nav>
          <div className="mt-10 grid grid-cols-2 gap-3 text-left sm:gap-5 lg:grid-cols-3">
            {katalog.map((p, i) => (
              <KartuProduk key={p.id_produk} produk={p} urutan={i} saatGulir />
            ))}
          </div>
          <Link href="/katalog" className={kelasTombol("utama", false, "mt-10 px-8")}>
            All Catalog
          </Link>
        </div>
      </section>

      {/* Custom */}
      <section id="custom" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-3xl bg-pink-muda p-8 sm:p-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose">
              <Sparkles size={14} aria-hidden /> Custom Bouquet
            </span>
            <h2 className="judul mt-4 text-5xl">Punya desain sendiri?</h2>
            <p className="mt-4 max-w-xl text-abu">
              Mau ganti kertas, jenis bunga, warna, atau buat Snack Bouquet dan Money Bouquet sesuai keinginan? Ceritakan idemu
              ke admin lewat WhatsApp. Setelah desain dan harga disepakati, admin membuat pesananmu dan kamu tinggal bayar
              QRIS dari halaman Pesanan Saya.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <a href={waCustom} target="_blank" rel="noopener noreferrer" className={kelasTombol("utama", false, "px-8 py-3")}>
              <MessageCircle size={18} aria-hidden /> Chat Admin via WhatsApp
            </a>
            <p className="text-xs text-abu">Pastikan kamu sudah punya akun supaya admin bisa membuat pesananmu.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-sage-muda px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="judul text-center text-5xl">Frequently Asked Questions</h2>
          <p className="mt-3 text-center text-abu">Pertanyaan yang paling sering ditanyakan seputar pemesanan.</p>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.t} className="group rounded-2xl border border-garis bg-white px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-tinta">
                  {f.t}
                  <span className="text-xl text-rose transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-abu">{f.j}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 rounded-3xl bg-linear-to-br from-[#7d4a5c] to-[#b4456b] p-8 text-white sm:p-12 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-5xl font-bold italic">Contact Us</h2>
            <ul className="mt-8 space-y-5">
              <li className="flex gap-3">
                <MapPin className="mt-1 shrink-0" size={20} aria-hidden />
                <div>
                  <p className="font-serif text-xl font-bold italic">Alamat Toko</p>
                  <p className="text-sm text-white/90">
                    {[toko.alamat, toko.kota, toko.kode_pos].filter(Boolean).join(", ")}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <MessageCircle className="mt-1 shrink-0" size={20} aria-hidden />
                <div>
                  <p className="font-serif text-xl font-bold italic">WhatsApp Admin</p>
                  <a href={linkWa(toko.no_whatsapp, `Halo ${toko.nama_toko}`)} className="text-sm text-white/90 underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                    +{toko.no_whatsapp}
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="font-serif text-xl font-bold italic">Jam Operasional</p>
              <dl className="mt-3 space-y-1 text-sm">
                {NAMA_HARI.map((h) => {
                  const jam = toko.jam_operasional[h];
                  return (
                    <div key={h} className="flex justify-between gap-3">
                      <dt className="capitalize">{h}</dt>
                      <dd className="text-white/90">{!jam || jam.libur ? "Tutup" : `${jam.buka.replace(":", ".")}–${jam.tutup.replace(":", ".")}`}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="font-serif text-xl font-bold italic">Area Pengiriman</p>
              <ul className="mt-3 space-y-1 text-sm">
                {zona.map((z) => (
                  <li key={z.id_zona} className="flex justify-between gap-3">
                    <span>{z.nama_zona}</span>
                    <span className="text-white/90">{rupiah(z.tarif)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-3">
                  <span>Ambil di toko</span>
                  <span className="text-white/90">Gratis</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
