-- Blossomé: pengerasan lanjutan (batas panjang isian, format nomor, batas laju pesanan, hak kolom, indeks)

-- 1) Batas panjang teks. Mencegah isian raksasa (spam/DoS) yang lolos dari form lewat request langsung.
alter table public.profiles
  add constraint profiles_alamat_panjang check (alamat is null or char_length(alamat) <= 500),
  add constraint profiles_no_telp_format check (no_telp is null or no_telp ~ '^\+?[0-9]{8,14}$');

alter table public.pesanan
  add constraint pesanan_alamat_panjang check (alamat_pengiriman is null or char_length(alamat_pengiriman) <= 500),
  add constraint pesanan_catatan_panjang check (catatan is null or char_length(catatan) <= 500),
  add constraint pesanan_alasan_panjang check (alasan_batal is null or char_length(alasan_batal) <= 500),
  add constraint pesanan_no_telp_format check (no_telp_penerima ~ '^\+?[0-9]{8,14}$');

alter table public.detail_pesanan
  add constraint detail_ucapan_panjang check (ucapan_kartu is null or char_length(ucapan_kartu) <= 300),
  add constraint detail_deskripsi_panjang check (deskripsi_custom is null or char_length(deskripsi_custom) <= 2000);

alter table public.riwayat_status
  add constraint riwayat_catatan_panjang check (catatan is null or char_length(catatan) <= 500);

alter table public.log_stok
  add constraint log_keterangan_panjang check (keterangan is null or char_length(keterangan) <= 300);

alter table public.kategori
  add constraint kategori_deskripsi_panjang check (deskripsi is null or char_length(deskripsi) <= 1000);

alter table public.produk
  add constraint produk_deskripsi_panjang check (deskripsi is null or char_length(deskripsi) <= 3000),
  add constraint produk_komposisi_panjang check (komposisi is null or char_length(komposisi) <= 500),
  add constraint produk_gambar_panjang check (gambar is null or char_length(gambar) <= 500);

alter table public.addon
  add constraint addon_gambar_panjang check (gambar is null or char_length(gambar) <= 500);

alter table public.pengaturan_toko
  add constraint pengaturan_alamat_panjang check (alamat is null or char_length(alamat) <= 500),
  add constraint pengaturan_deskripsi_panjang check (deskripsi is null or char_length(deskripsi) <= 1000);

-- 2) Batas laju: maksimal 10 pesanan katalog per pelanggan per jam (anti spam yang memutar stok).
--    Dijalankan di dalam transaksi buat_pesanan yang sudah memegang kunci per pelanggan, jadi hitungannya akurat.
create or replace function private.batasi_laju_pesanan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipe_pesanan = 'katalog' and (
    select count(*) from public.pesanan
    where id_user = new.id_user and tipe_pesanan = 'katalog' and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Terlalu banyak pesanan dalam satu jam. Coba lagi nanti atau hubungi kami lewat WhatsApp.';
  end if;
  return new;
end;
$$;
revoke all on function private.batasi_laju_pesanan() from public;

create trigger pesanan_batas_laju
  before insert on public.pesanan
  for each row execute function private.batasi_laju_pesanan();

-- 3) Penyesuaian stok manual dibatasi supaya tidak bisa overflow / salah ketik ekstrem.
create or replace function public.sesuaikan_stok(p_jenis text, p_id integer, p_delta integer, p_keterangan text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_lama int;
  v_baru int;
  v_ket text := nullif(left(trim(coalesce(p_keterangan, '')), 300), '');
begin
  if not private.is_admin() then
    raise exception 'Akses ditolak';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Jumlah perubahan stok tidak boleh 0';
  end if;
  if abs(p_delta) > 100000 then
    raise exception 'Perubahan stok maksimal 100.000 sekali simpan';
  end if;

  if p_jenis = 'produk' then
    select stok into v_lama from public.produk where id_produk = p_id for update;
  elsif p_jenis = 'addon' then
    select stok into v_lama from public.addon where id_addon = p_id for update;
  else
    raise exception 'Jenis stok tidak valid';
  end if;
  if not found then
    raise exception 'Data tidak ditemukan';
  end if;

  v_baru := v_lama + p_delta;
  if v_baru < 0 then
    raise exception 'Stok tidak boleh kurang dari 0 (stok sekarang %)', v_lama;
  end if;
  if v_baru > 1000000 then
    raise exception 'Stok maksimal 1.000.000';
  end if;

  if p_jenis = 'produk' then
    update public.produk set stok = v_baru where id_produk = p_id;
    insert into public.log_stok (id_produk, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (p_id, v_admin, case when p_delta > 0 then 'masuk'::public.tipe_log_stok else 'penyesuaian'::public.tipe_log_stok end,
            abs(p_delta), v_lama, v_baru, v_ket);
  else
    update public.addon set stok = v_baru where id_addon = p_id;
    insert into public.log_stok (id_addon, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (p_id, v_admin, case when p_delta > 0 then 'masuk'::public.tipe_log_stok else 'penyesuaian'::public.tipe_log_stok end,
            abs(p_delta), v_lama, v_baru, v_ket);
  end if;

  return v_baru;
end;
$$;
revoke all on function public.sesuaikan_stok(text, integer, integer, text) from public, anon;
grant execute on function public.sesuaikan_stok(text, integer, integer, text) to authenticated;

-- 4) Hak kolom: admin tidak perlu (dan tidak boleh) menulis id / created_at / updated_at secara langsung.
revoke insert, update on public.kategori from authenticated;
grant insert (nama_kategori, slug, deskripsi) on public.kategori to authenticated;
grant update (nama_kategori, slug, deskripsi) on public.kategori to authenticated;

revoke insert, update on public.zona_pengiriman from authenticated;
grant insert (nama_zona, tarif, is_aktif, urutan) on public.zona_pengiriman to authenticated;
grant update (nama_zona, tarif, is_aktif, urutan) on public.zona_pengiriman to authenticated;

revoke update on public.pengaturan_toko from authenticated;
grant update (nama_toko, deskripsi, alamat, kota, kode_pos, no_whatsapp, email, logo, jam_operasional, slot_kirim,
              jam_cutoff, is_buka, terima_preorder, batas_bayar_menit, template_email)
  on public.pengaturan_toko to authenticated;

revoke insert on public.keranjang_item from authenticated;
grant insert (id_user, id_produk, jumlah) on public.keranjang_item to authenticated;
revoke insert on public.keranjang_addon from authenticated;
grant insert (id_keranjang_item, id_addon, jumlah) on public.keranjang_addon to authenticated;

-- 5) Indeks: pesanan_id_user_idx sudah tercakup oleh pesanan_user_created_idx (id_user, created_at desc).
drop index if exists public.pesanan_id_user_idx;
