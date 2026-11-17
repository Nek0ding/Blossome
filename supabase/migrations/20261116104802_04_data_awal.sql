-- Blossomé: data awal (pengaturan toko, zona, kategori, addon, produk contoh)

insert into public.pengaturan_toko (
  id, nama_toko, deskripsi, email, no_whatsapp, alamat, kota, kode_pos,
  is_buka, jam_operasional, jam_cutoff, slot_kirim, batas_bayar_menit, terima_preorder, template_email
)
values (
  1,
  'Blossomé',
  'Buket cantik untuk setiap momen spesialmu. Dirangkai dengan hati, untuk hadiah yang penuh arti.',
  null,
  '6281234567890',
  'Jl. Melati No. 12, Pancoran Mas',
  'Depok, Jawa Barat',
  '16431',
  true,
  '{
    "senin":  {"buka": "09:00", "tutup": "18:00", "libur": false},
    "selasa": {"buka": "09:00", "tutup": "18:00", "libur": false},
    "rabu":   {"buka": "09:00", "tutup": "18:00", "libur": false},
    "kamis":  {"buka": "09:00", "tutup": "18:00", "libur": false},
    "jumat":  {"buka": "09:00", "tutup": "18:00", "libur": false},
    "sabtu":  {"buka": "09:00", "tutup": "16:00", "libur": false},
    "minggu": {"buka": "09:00", "tutup": "16:00", "libur": true}
  }'::jsonb,
  '14:00',
  '[
    {"mulai": "09:00", "selesai": "12:00"},
    {"mulai": "12:00", "selesai": "15:00"},
    {"mulai": "15:00", "selesai": "18:00"}
  ]'::jsonb,
  30,
  true,
  jsonb_build_object(
    'pembayaran_berhasil', jsonb_build_object(
      'subjek', 'Pembayaran {nomor_pesanan} berhasil',
      'isi', E'Hai {nama_pelanggan},\n\nPembayaran untuk pesanan {nomor_pesanan} sebesar {total} sudah kami terima. Buketmu mulai kami siapkan.\n\nTerima kasih,\n{nama_toko}'
    ),
    'orderan_masuk', jsonb_build_object(
      'subjek', 'Orderan masuk: {nomor_pesanan}',
      'isi', E'Ada orderan baru yang sudah dibayar.\n\nNomor pesanan: {nomor_pesanan}\nPelanggan: {nama_pelanggan}\nTotal: {total}\n\nBuka dashboard admin untuk memprosesnya.'
    )
  )
);

insert into public.zona_pengiriman (nama_zona, tarif, urutan) values
  ('Depok', 20000, 1),
  ('Jakarta', 40000, 2),
  ('Sekitar Jakarta', 50000, 3);

insert into public.kategori (nama_kategori, slug, deskripsi) values
  ('Hand Bouquet', 'hand-bouquet', 'Buket genggam untuk wisuda, ulang tahun, dan hadiah.'),
  ('Bloom Box', 'bloom-box', 'Rangkaian bunga dalam kotak.'),
  ('Vase Arrangement', 'vase-arrangement', 'Rangkaian bunga dalam vas.'),
  ('Standing Flower', 'standing-flower', 'Bunga papan berdiri untuk ucapan selamat dan duka cita.'),
  ('Snack Bouquet', 'snack-bouquet', 'Buket berisi aneka camilan.'),
  ('Money Bouquet', 'money-bouquet', 'Buket uang untuk hadiah spesial.');

insert into public.addon (nama_addon, harga, stok, stok_minimum, is_kartu_ucapan) values
  ('Kartu Ucapan', 5000, 100, 10, true),
  ('Boneka', 35000, 20, 5, false),
  ('Pita', 5000, 50, 10, false),
  ('Coklat', 25000, 30, 5, false),
  ('Balon', 15000, 30, 5, false);

insert into public.produk (id_kategori, nama_produk, slug, deskripsi, komposisi, harga, stok, is_best_seller)
select k.id_kategori, v.nama, v.slug, v.deskripsi, v.komposisi, v.harga, v.stok, v.best
from (values
  ('hand-bouquet', 'Omakase Artificial Flowers', 'omakase-artificial-flowers', 'Buket bunga artifisial pilihan florist. Awet dan cocok untuk kenang-kenangan.', 'Mawar Pink, Baby''s Breath, Eucalyptus', 350000, 10, true),
  ('hand-bouquet', 'Blush Butterfly Dream', 'blush-butterfly-dream', 'Buket bernuansa pink lembut dengan aksen kupu-kupu.', 'Mawar Pink, Baby''s Breath, Eucalyptus', 350000, 10, true),
  ('hand-bouquet', 'Thumbelina Fresh Flowers', 'thumbelina-fresh-flowers', 'Buket bunga segar warna-warni yang ceria.', 'Gerbera, Mawar, Baby''s Breath', 350000, 10, true),
  ('hand-bouquet', 'Korean Soft Pastels', 'korean-soft-pastels', 'Buket gaya Korea dengan warna pastel yang lembut.', 'Mawar Pastel, Carnation, Eucalyptus', 320000, 10, true),
  ('hand-bouquet', 'Bouquet Lily Pink', 'bouquet-lily-pink', 'Rangkaian lily pink segar yang dibungkus kertas putih.', 'Lily Pink, Baby''s Breath', 350000, 8, false),
  ('bloom-box', 'Graceful White Lily', 'graceful-white-lily', 'Lily putih dalam kotak, anggun untuk segala momen.', 'Lily Putih, Eucalyptus', 420000, 6, true)
) as v(kategori_slug, nama, slug, deskripsi, komposisi, harga, stok, best)
join public.kategori k on k.slug = v.kategori_slug;

insert into public.log_stok (id_produk, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
select id_produk, 'masuk', stok, 0, stok, 'Stok awal' from public.produk where stok > 0;

insert into public.log_stok (id_addon, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
select id_addon, 'masuk', stok, 0, stok, 'Stok awal' from public.addon where stok > 0;
