-- Blossomé: admin utama yang bisa menambah / mencabut admin lain.

-- 1) Penanda admin utama. Maksimal satu, dan selalu ber-role admin.
alter table public.profiles
  add column is_admin_utama boolean not null default false,
  add constraint profiles_admin_utama_harus_admin check (not is_admin_utama or role = 'admin');

create unique index profiles_satu_admin_utama on public.profiles (is_admin_utama) where is_admin_utama;

-- Admin pertama (paling awal dibuat) menjadi admin utama.
update public.profiles
set is_admin_utama = true
where id = (select id from public.profiles where role = 'admin' order by created_at, id limit 1);

-- Kolom ini tidak boleh diubah langsung oleh pengguna (hak update profiles hanya nama, no_telp, alamat).

create or replace function private.is_admin_utama()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and is_admin_utama
  );
$$;
revoke all on function private.is_admin_utama() from public;
grant execute on function private.is_admin_utama() to authenticated;

-- 2) Ubah peran akun lain (customer <-> admin). Hanya admin utama.
create or replace function public.ubah_peran_akun(p_id_user uuid, p_peran public.peran_user)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_target public.profiles%rowtype;
begin
  if v_uid is null or not private.is_admin_utama() then
    raise exception 'Hanya admin utama yang bisa mengubah peran akun.';
  end if;
  if p_id_user is null or p_peran is null then
    raise exception 'Data tidak lengkap.';
  end if;
  if p_id_user = v_uid then
    raise exception 'Kamu tidak bisa mengubah peran akunmu sendiri.';
  end if;

  select * into v_target from public.profiles where id = p_id_user for update;
  if not found then
    raise exception 'Akun tidak ditemukan.';
  end if;
  if v_target.is_admin_utama then
    raise exception 'Peran admin utama tidak bisa diubah.';
  end if;
  if v_target.role = p_peran then
    return jsonb_build_object('hasil', 'tidak_berubah', 'peran', p_peran);
  end if;

  if p_peran = 'admin' then
    -- Admin tidak berbelanja: pastikan tidak ada pesanan yang masih menunggu pembayaran.
    if exists (select 1 from public.pesanan where id_user = p_id_user and status = 'belum_dibayar') then
      raise exception 'Akun ini masih punya pesanan yang belum dibayar. Selesaikan atau batalkan dulu sebelum dijadikan admin.';
    end if;
    delete from public.keranjang_item where id_user = p_id_user;
  end if;

  update public.profiles set role = p_peran where id = p_id_user;

  insert into public.notifikasi (id_user, id_pesanan, tipe, judul, pesan, channel)
  values (
    p_id_user, null, 'status',
    case when p_peran = 'admin' then 'Akunmu sekarang admin' else 'Akses admin dicabut' end,
    case when p_peran = 'admin'
      then 'Kamu sekarang bisa membuka admin panel Blossomé.'
      else 'Akunmu kembali menjadi akun pelanggan.'
    end,
    'web'
  );

  return jsonb_build_object('hasil', 'diubah', 'peran', p_peran);
end;
$$;
revoke all on function public.ubah_peran_akun(uuid, public.peran_user) from public, anon;
grant execute on function public.ubah_peran_akun(uuid, public.peran_user) to authenticated;
