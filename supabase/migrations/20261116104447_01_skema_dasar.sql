-- Blossomé: skema dasar (enum, tabel, indeks, trigger updated_at)

create schema if not exists private;

create type public.peran_user as enum ('customer', 'admin');
create type public.tipe_pesanan as enum ('katalog', 'custom');
create type public.status_pesanan as enum ('belum_dibayar', 'diproses', 'dikirim', 'siap_diambil', 'selesai', 'dibatalkan');
create type public.metode_pengiriman as enum ('kirim', 'ambil');
create type public.status_bayar as enum ('menunggu', 'lunas', 'kedaluwarsa', 'gagal', 'dibatalkan');
create type public.tipe_log_stok as enum ('masuk', 'keluar', 'kembali', 'penyesuaian');
create type public.tipe_notifikasi as enum ('pembayaran_berhasil', 'orderan_masuk', 'status');
create type public.channel_notifikasi as enum ('web', 'email');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profil pengguna (data login ada di auth.users milik Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama varchar(100) not null default '',
  email varchar(255) not null default '',
  no_telp varchar(15),
  alamat text,
  role public.peran_user not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kategori (
  id_kategori int generated always as identity primary key,
  nama_kategori varchar(100) not null,
  slug varchar(120) not null unique,
  deskripsi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.produk (
  id_produk int generated always as identity primary key,
  id_kategori int not null references public.kategori (id_kategori) on delete restrict,
  nama_produk varchar(200) not null,
  slug varchar(220) not null unique,
  deskripsi text,
  komposisi text,
  harga numeric(12, 0) not null check (harga >= 0),
  stok int not null default 0 check (stok >= 0),
  stok_minimum int not null default 5 check (stok_minimum >= 0),
  gambar text,
  is_aktif boolean not null default true,
  is_best_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addon (
  id_addon int generated always as identity primary key,
  nama_addon varchar(100) not null,
  harga numeric(12, 0) not null check (harga >= 0),
  stok int not null default 0 check (stok >= 0),
  stok_minimum int not null default 5 check (stok_minimum >= 0),
  gambar text,
  is_aktif boolean not null default true,
  is_kartu_ucapan boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.zona_pengiriman (
  id_zona int generated always as identity primary key,
  nama_zona varchar(100) not null,
  tarif numeric(12, 0) not null check (tarif >= 0),
  is_aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Satu baris saja (id = 1)
create table public.pengaturan_toko (
  id int primary key default 1 check (id = 1),
  nama_toko varchar(100) not null,
  deskripsi text,
  logo text,
  email varchar(255),
  no_whatsapp varchar(20),
  alamat text,
  kota varchar(100),
  kode_pos varchar(10),
  is_buka boolean not null default true,
  jam_operasional jsonb not null,
  jam_cutoff time not null default '14:00',
  slot_kirim jsonb not null,
  batas_bayar_menit int not null default 30 check (batas_bayar_menit between 5 and 60),
  terima_preorder boolean not null default true,
  template_email jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.keranjang_item (
  id_keranjang_item int generated always as identity primary key,
  id_user uuid not null references public.profiles (id) on delete cascade,
  id_produk int not null references public.produk (id_produk) on delete cascade,
  jumlah int not null check (jumlah between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.keranjang_addon (
  id int generated always as identity primary key,
  id_keranjang_item int not null references public.keranjang_item (id_keranjang_item) on delete cascade,
  id_addon int not null references public.addon (id_addon) on delete cascade,
  jumlah int not null check (jumlah between 1 and 99),
  unique (id_keranjang_item, id_addon)
);

create sequence public.pesanan_kode_seq;

create table public.pesanan (
  id_pesanan int generated always as identity primary key,
  kode_pesanan varchar(20) not null unique default ('BLS-' || lpad(nextval('public.pesanan_kode_seq')::text, 5, '0')),
  id_user uuid not null references public.profiles (id) on delete restrict,
  tipe_pesanan public.tipe_pesanan not null default 'katalog',
  nama_penerima varchar(100) not null,
  no_telp_penerima varchar(15) not null,
  metode_pengiriman public.metode_pengiriman not null,
  id_zona int references public.zona_pengiriman (id_zona) on delete restrict,
  alamat_pengiriman text,
  tanggal_kirim date not null,
  slot_kirim varchar(20) not null,
  catatan text,
  subtotal numeric(12, 0) not null default 0 check (subtotal >= 0),
  ongkir numeric(12, 0) not null default 0 check (ongkir >= 0),
  total_harga numeric(12, 0) generated always as (subtotal + ongkir) stored,
  status public.status_pesanan not null default 'belum_dibayar',
  batas_bayar_at timestamptz not null,
  alasan_batal text,
  dibatalkan_oleh uuid references public.profiles (id) on delete set null,
  dibuat_oleh uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pesanan_alamat_kirim check (
    metode_pengiriman = 'ambil'
    or (id_zona is not null and alamat_pengiriman is not null)
  )
);

create table public.detail_pesanan (
  id_detail int generated always as identity primary key,
  id_pesanan int not null references public.pesanan (id_pesanan) on delete cascade,
  id_produk int references public.produk (id_produk) on delete set null,
  nama_item varchar(200) not null,
  deskripsi_custom text,
  jumlah int not null check (jumlah > 0),
  harga_satuan numeric(12, 0) not null check (harga_satuan >= 0),
  subtotal numeric(12, 0) not null check (subtotal >= 0),
  ucapan_kartu text
);

create table public.detail_addon (
  id_detail_addon int generated always as identity primary key,
  id_detail int not null references public.detail_pesanan (id_detail) on delete cascade,
  id_addon int references public.addon (id_addon) on delete set null,
  nama_addon varchar(100) not null,
  jumlah int not null check (jumlah > 0),
  harga_satuan numeric(12, 0) not null check (harga_satuan >= 0),
  subtotal numeric(12, 0) not null check (subtotal >= 0)
);

-- Satu baris per percobaan bayar (charge) ke Midtrans
create table public.pembayaran (
  id_pembayaran int generated always as identity primary key,
  id_pesanan int not null references public.pesanan (id_pesanan) on delete cascade,
  metode varchar(20) not null default 'qris',
  nominal numeric(12, 0) not null check (nominal > 0),
  gateway_order_id varchar(50) not null unique,
  gateway_transaction_id varchar(100),
  qris_payload text,
  qr_url text,
  status_bayar public.status_bayar not null default 'menunggu',
  kadaluarsa_at timestamptz not null,
  dibayar_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.log_stok (
  id_log int generated always as identity primary key,
  id_produk int references public.produk (id_produk) on delete cascade,
  id_addon int references public.addon (id_addon) on delete cascade,
  id_pesanan int references public.pesanan (id_pesanan) on delete set null,
  id_user uuid references public.profiles (id) on delete set null,
  tipe public.tipe_log_stok not null,
  jumlah int not null check (jumlah > 0),
  stok_sebelum int not null,
  stok_sesudah int not null,
  keterangan text,
  created_at timestamptz not null default now(),
  constraint log_stok_satu_target check (num_nonnulls(id_produk, id_addon) = 1)
);

create table public.riwayat_status (
  id_riwayat int generated always as identity primary key,
  id_pesanan int not null references public.pesanan (id_pesanan) on delete cascade,
  id_user uuid references public.profiles (id) on delete set null,
  status public.status_pesanan not null,
  catatan text,
  created_at timestamptz not null default now()
);

-- id_user null = email untuk toko
create table public.notifikasi (
  id_notifikasi int generated always as identity primary key,
  id_user uuid references public.profiles (id) on delete cascade,
  id_pesanan int references public.pesanan (id_pesanan) on delete cascade,
  tipe public.tipe_notifikasi not null,
  judul varchar(150) not null,
  pesan text not null,
  channel public.channel_notifikasi not null default 'web',
  is_dibaca boolean not null default false,
  email_terkirim boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indeks untuk foreign key dan pencarian yang sering dipakai
create index produk_id_kategori_idx on public.produk (id_kategori);
create index keranjang_item_id_user_idx on public.keranjang_item (id_user);
create index keranjang_item_id_produk_idx on public.keranjang_item (id_produk);
create index keranjang_addon_id_addon_idx on public.keranjang_addon (id_addon);
create index pesanan_id_user_idx on public.pesanan (id_user);
create index pesanan_id_zona_idx on public.pesanan (id_zona);
create index pesanan_status_idx on public.pesanan (status, batas_bayar_at);
create index pesanan_dibatalkan_oleh_idx on public.pesanan (dibatalkan_oleh);
create index pesanan_dibuat_oleh_idx on public.pesanan (dibuat_oleh);
create index detail_pesanan_id_pesanan_idx on public.detail_pesanan (id_pesanan);
create index detail_pesanan_id_produk_idx on public.detail_pesanan (id_produk);
create index detail_addon_id_detail_idx on public.detail_addon (id_detail);
create index detail_addon_id_addon_idx on public.detail_addon (id_addon);
create index pembayaran_id_pesanan_idx on public.pembayaran (id_pesanan);
create index log_stok_id_produk_idx on public.log_stok (id_produk);
create index log_stok_id_addon_idx on public.log_stok (id_addon);
create index log_stok_id_pesanan_idx on public.log_stok (id_pesanan);
create index log_stok_id_user_idx on public.log_stok (id_user);
create index riwayat_status_id_pesanan_idx on public.riwayat_status (id_pesanan);
create index riwayat_status_id_user_idx on public.riwayat_status (id_user);
create index notifikasi_id_user_idx on public.notifikasi (id_user, is_dibaca);
create index notifikasi_id_pesanan_idx on public.notifikasi (id_pesanan);

-- Trigger updated_at
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger kategori_set_updated_at before update on public.kategori for each row execute function private.set_updated_at();
create trigger produk_set_updated_at before update on public.produk for each row execute function private.set_updated_at();
create trigger addon_set_updated_at before update on public.addon for each row execute function private.set_updated_at();
create trigger zona_pengiriman_set_updated_at before update on public.zona_pengiriman for each row execute function private.set_updated_at();
create trigger pengaturan_toko_set_updated_at before update on public.pengaturan_toko for each row execute function private.set_updated_at();
create trigger keranjang_item_set_updated_at before update on public.keranjang_item for each row execute function private.set_updated_at();
create trigger pesanan_set_updated_at before update on public.pesanan for each row execute function private.set_updated_at();
create trigger pembayaran_set_updated_at before update on public.pembayaran for each row execute function private.set_updated_at();
