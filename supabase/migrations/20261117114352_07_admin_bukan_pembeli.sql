-- Blossomé: akun admin tidak boleh berbelanja (keranjang & pesanan katalog) untuk dirinya sendiri.
-- Pesanan custom tetap dibuat admin untuk pelanggan lewat buat_pesanan_custom (dicek role 'customer' di sana).

create or replace function private.batasi_keranjang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where id = new.id_user and role = 'admin') then
    raise exception 'Akun admin tidak bisa berbelanja. Gunakan akun pelanggan.';
  end if;
  -- Kunci yang sama dengan checkout: item baru tidak bisa masuk saat checkout berjalan,
  -- dan dua insert bersamaan tidak sama-sama lolos batas 30 item
  perform pg_advisory_xact_lock(hashtextextended('blossome:checkout:' || new.id_user::text, 0));
  if (select count(*) from public.keranjang_item where id_user = new.id_user) >= 30 then
    raise exception 'Keranjang maksimal 30 item. Checkout dulu atau hapus sebagian.';
  end if;
  return new;
end;
$$;
revoke all on function private.batasi_keranjang() from public;

create or replace function private.batasi_laju_pesanan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipe_pesanan = 'katalog' then
    if exists (select 1 from public.profiles where id = new.id_user and role = 'admin') then
      raise exception 'Akun admin tidak bisa membuat pesanan. Gunakan akun pelanggan.';
    end if;
    if (
      select count(*) from public.pesanan
      where id_user = new.id_user and tipe_pesanan = 'katalog' and created_at > now() - interval '1 hour'
    ) >= 10 then
      raise exception 'Terlalu banyak pesanan dalam satu jam. Coba lagi nanti atau hubungi kami lewat WhatsApp.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.batasi_laju_pesanan() from public;
