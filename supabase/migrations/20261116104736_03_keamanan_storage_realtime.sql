-- Blossomé: RLS, hak akses, storage, realtime, dan cron

-- Hak akses dasar: cabut semua, lalu beri seperlunya
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;

grant select on public.kategori, public.produk, public.addon, public.zona_pengiriman, public.pengaturan_toko to anon, authenticated;
grant insert, update, delete on public.kategori, public.produk, public.addon, public.zona_pengiriman to authenticated;
grant update on public.pengaturan_toko to authenticated;

grant select on public.profiles to authenticated;
grant update (nama, no_telp, alamat) on public.profiles to authenticated;

grant select, insert, update, delete on public.keranjang_item, public.keranjang_addon to authenticated;

grant select on public.pesanan, public.detail_pesanan, public.detail_addon, public.pembayaran,
  public.riwayat_status, public.log_stok, public.notifikasi to authenticated;
grant update (is_dibaca) on public.notifikasi to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant execute on function public.buat_pesanan(text, text, public.metode_pengiriman, int, text, date, text, text, jsonb) to authenticated;
grant execute on function public.buat_pesanan_custom(uuid, text, text, numeric, int, jsonb, text, text, text, public.metode_pengiriman, int, text, date, text, text) to authenticated;
grant execute on function public.batalkan_pesanan_saya(int) to authenticated;
grant execute on function public.ubah_status_pesanan(int, public.status_pesanan, text) to authenticated;
grant execute on function public.sesuaikan_stok(text, int, int, text) to authenticated;
grant execute on function public.tandai_pembayaran_lunas(text, text, jsonb) to service_role;
grant execute on function public.tandai_pembayaran_tidak_berhasil(text, public.status_bayar, jsonb) to service_role;
grant execute on function public.batalkan_pesanan_kedaluwarsa() to service_role;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.kategori enable row level security;
alter table public.produk enable row level security;
alter table public.addon enable row level security;
alter table public.zona_pengiriman enable row level security;
alter table public.pengaturan_toko enable row level security;
alter table public.keranjang_item enable row level security;
alter table public.keranjang_addon enable row level security;
alter table public.pesanan enable row level security;
alter table public.detail_pesanan enable row level security;
alter table public.detail_addon enable row level security;
alter table public.pembayaran enable row level security;
alter table public.log_stok enable row level security;
alter table public.riwayat_status enable row level security;
alter table public.notifikasi enable row level security;

-- profiles
create policy "lihat profil sendiri atau admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "ubah profil sendiri" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Data katalog: semua orang boleh baca, hanya admin yang boleh tulis
create policy "baca kategori" on public.kategori
  for select to anon, authenticated using (true);
create policy "baca produk aktif" on public.produk
  for select to anon, authenticated
  using (is_aktif or (select private.is_admin()));
create policy "baca addon aktif" on public.addon
  for select to anon, authenticated
  using (is_aktif or (select private.is_admin()));
create policy "baca zona aktif" on public.zona_pengiriman
  for select to anon, authenticated
  using (is_aktif or (select private.is_admin()));
create policy "baca pengaturan toko" on public.pengaturan_toko
  for select to anon, authenticated using (true);
create policy "admin ubah pengaturan toko" on public.pengaturan_toko
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

do $$
declare
  t text;
begin
  foreach t in array array['kategori', 'produk', 'addon', 'zona_pengiriman'] loop
    execute format('create policy "admin tambah %1$s" on public.%1$I for insert to authenticated with check ((select private.is_admin()))', t);
    execute format('create policy "admin ubah %1$s" on public.%1$I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format('create policy "admin hapus %1$s" on public.%1$I for delete to authenticated using ((select private.is_admin()))', t);
  end loop;
end;
$$;

-- Keranjang: hanya pemiliknya
create policy "keranjang milik sendiri" on public.keranjang_item
  for all to authenticated
  using (id_user = (select auth.uid()))
  with check (id_user = (select auth.uid()));
create policy "addon keranjang milik sendiri" on public.keranjang_addon
  for all to authenticated
  using (exists (
    select 1 from public.keranjang_item ki
    where ki.id_keranjang_item = keranjang_addon.id_keranjang_item and ki.id_user = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.keranjang_item ki
    where ki.id_keranjang_item = keranjang_addon.id_keranjang_item and ki.id_user = (select auth.uid())
  ));

-- Pesanan dan turunannya: pemilik atau admin boleh baca. Tulis hanya lewat fungsi.
create policy "lihat pesanan sendiri atau admin" on public.pesanan
  for select to authenticated
  using (id_user = (select auth.uid()) or (select private.is_admin()));
create policy "lihat detail pesanan" on public.detail_pesanan
  for select to authenticated
  using (exists (
    select 1 from public.pesanan p
    where p.id_pesanan = detail_pesanan.id_pesanan
      and (p.id_user = (select auth.uid()) or (select private.is_admin()))
  ));
create policy "lihat detail addon" on public.detail_addon
  for select to authenticated
  using (exists (
    select 1 from public.detail_pesanan dp
    join public.pesanan p on p.id_pesanan = dp.id_pesanan
    where dp.id_detail = detail_addon.id_detail
      and (p.id_user = (select auth.uid()) or (select private.is_admin()))
  ));
create policy "lihat pembayaran" on public.pembayaran
  for select to authenticated
  using (exists (
    select 1 from public.pesanan p
    where p.id_pesanan = pembayaran.id_pesanan
      and (p.id_user = (select auth.uid()) or (select private.is_admin()))
  ));
create policy "lihat riwayat status" on public.riwayat_status
  for select to authenticated
  using (exists (
    select 1 from public.pesanan p
    where p.id_pesanan = riwayat_status.id_pesanan
      and (p.id_user = (select auth.uid()) or (select private.is_admin()))
  ));
create policy "admin lihat log stok" on public.log_stok
  for select to authenticated
  using ((select private.is_admin()));

-- Notifikasi: hanya milik sendiri
create policy "lihat notifikasi sendiri" on public.notifikasi
  for select to authenticated
  using (id_user = (select auth.uid()));
create policy "tandai notifikasi dibaca" on public.notifikasi
  for update to authenticated
  using (id_user = (select auth.uid()))
  with check (id_user = (select auth.uid()));

-- Storage: bucket gambar produk dan addon (baca publik, tulis hanya admin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('produk', 'produk', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('addon', 'addon', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin lihat gambar katalog" on storage.objects
  for select to authenticated
  using (bucket_id in ('produk', 'addon') and (select private.is_admin()));
create policy "admin unggah gambar katalog" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('produk', 'addon') and (select private.is_admin()));
create policy "admin ubah gambar katalog" on storage.objects
  for update to authenticated
  using (bucket_id in ('produk', 'addon') and (select private.is_admin()))
  with check (bucket_id in ('produk', 'addon') and (select private.is_admin()));
create policy "admin hapus gambar katalog" on storage.objects
  for delete to authenticated
  using (bucket_id in ('produk', 'addon') and (select private.is_admin()));

-- Realtime: notifikasi lonceng dan status pesanan di halaman bayar
alter publication supabase_realtime add table public.notifikasi;
alter publication supabase_realtime add table public.pesanan;

-- Cron cadangan untuk pesanan yang lewat batas bayar
create extension if not exists pg_cron;
select cron.schedule(
  'blossome-batalkan-pesanan-kedaluwarsa',
  '*/5 * * * *',
  $cron$select public.batalkan_pesanan_kedaluwarsa()$cron$
);
