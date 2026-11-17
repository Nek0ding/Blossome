-- Blossomé: fungsi dan trigger (auth, checkout, stok, status, pembayaran)

-- Cek apakah pengguna yang sedang login adalah admin
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Buat baris profiles setiap ada user baru di Supabase Auth
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nama, email)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nama'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ), 100),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- Validasi tanggal dan slot kirim. p_admin = true melewati aturan toko buka, cut-off, dan pre-order.
create or replace function private.validasi_jadwal(p_tanggal date, p_slot text, p_admin boolean)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_set public.pengaturan_toko%rowtype;
  v_now timestamp := now() at time zone 'Asia/Jakarta';
  v_hari text;
  v_jam jsonb;
  v_slot jsonb;
begin
  select * into v_set from public.pengaturan_toko where id = 1;
  if not found then
    raise exception 'Pengaturan toko belum diisi';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal wajib diisi';
  end if;
  if p_tanggal < v_now::date then
    raise exception 'Tanggal yang dipilih sudah lewat';
  end if;
  if p_tanggal > v_now::date + 30 then
    raise exception 'Tanggal maksimal 30 hari dari sekarang';
  end if;

  v_hari := (array['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'])[extract(isodow from p_tanggal)::int];
  v_jam := v_set.jam_operasional -> v_hari;
  if v_jam is null or coalesce((v_jam ->> 'libur')::boolean, false) then
    raise exception 'Toko tutup pada hari yang dipilih';
  end if;

  select s into v_slot
  from jsonb_array_elements(v_set.slot_kirim) as s
  where (s ->> 'mulai') || '-' || (s ->> 'selesai') = p_slot;
  if v_slot is null then
    raise exception 'Slot waktu tidak tersedia';
  end if;
  if (v_slot ->> 'mulai')::time >= (v_jam ->> 'tutup')::time then
    raise exception 'Slot waktu di luar jam operasional hari itu';
  end if;

  if p_admin then
    return;
  end if;

  if not v_set.is_buka then
    raise exception 'Toko sedang tutup, pesanan belum bisa dibuat';
  end if;
  if p_tanggal = v_now::date then
    if v_now::time >= v_set.jam_cutoff then
      raise exception 'Pesanan untuk hari ini sudah ditutup. Pilih tanggal lain.';
    end if;
    if (v_slot ->> 'mulai')::time <= v_now::time then
      raise exception 'Slot waktu yang dipilih sudah lewat';
    end if;
  elsif not v_set.terima_preorder then
    raise exception 'Toko belum menerima pesanan untuk hari lain';
  end if;
end;
$$;

-- Kembalikan stok produk dan addon dari satu pesanan
create or replace function private.kembalikan_stok(p_id_pesanan int, p_oleh uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_stok int;
  v_kode text;
begin
  select kode_pesanan into v_kode from public.pesanan where id_pesanan = p_id_pesanan;

  for v in
    select dp.id_produk, sum(dp.jumlah)::int as total
    from public.detail_pesanan dp
    where dp.id_pesanan = p_id_pesanan and dp.id_produk is not null
    group by dp.id_produk
    order by dp.id_produk
  loop
    update public.produk set stok = stok + v.total where id_produk = v.id_produk returning stok into v_stok;
    if found then
      insert into public.log_stok (id_produk, id_pesanan, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
      values (v.id_produk, p_id_pesanan, p_oleh, 'kembali', v.total, v_stok - v.total, v_stok, 'Pesanan ' || v_kode || ' dibatalkan');
    end if;
  end loop;

  for v in
    select da.id_addon, sum(da.jumlah)::int as total
    from public.detail_addon da
    join public.detail_pesanan dp on dp.id_detail = da.id_detail
    where dp.id_pesanan = p_id_pesanan and da.id_addon is not null
    group by da.id_addon
    order by da.id_addon
  loop
    update public.addon set stok = stok + v.total where id_addon = v.id_addon returning stok into v_stok;
    if found then
      insert into public.log_stok (id_addon, id_pesanan, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
      values (v.id_addon, p_id_pesanan, p_oleh, 'kembali', v.total, v_stok - v.total, v_stok, 'Pesanan ' || v_kode || ' dibatalkan');
    end if;
  end loop;
end;
$$;

-- Batalkan pesanan: status, pembayaran yang masih menunggu, stok, riwayat, notifikasi
create or replace function private.batalkan_pesanan(
  p_id_pesanan int,
  p_oleh uuid,
  p_alasan text,
  p_status_bayar public.status_bayar
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pes public.pesanan%rowtype;
begin
  select * into v_pes from public.pesanan where id_pesanan = p_id_pesanan for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;
  if v_pes.status not in ('belum_dibayar', 'diproses') then
    raise exception 'Pesanan dengan status ini tidak bisa dibatalkan';
  end if;

  update public.pesanan
  set status = 'dibatalkan', alasan_batal = p_alasan, dibatalkan_oleh = p_oleh
  where id_pesanan = p_id_pesanan;

  update public.pembayaran
  set status_bayar = p_status_bayar
  where id_pesanan = p_id_pesanan and status_bayar = 'menunggu';

  perform private.kembalikan_stok(p_id_pesanan, p_oleh);

  insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
  values (p_id_pesanan, p_oleh, 'dibatalkan', p_alasan);

  insert into public.notifikasi (id_user, id_pesanan, tipe, judul, pesan, channel)
  values (
    v_pes.id_user, p_id_pesanan, 'status',
    'Pesanan ' || v_pes.kode_pesanan || ' dibatalkan',
    coalesce(p_alasan, 'Pesanan dibatalkan.'),
    'web'
  );
end;
$$;

-- Checkout: ubah isi keranjang menjadi pesanan dalam satu transaksi
create or replace function public.buat_pesanan(
  p_nama_penerima text,
  p_no_telp_penerima text,
  p_metode public.metode_pengiriman,
  p_id_zona int,
  p_alamat text,
  p_tanggal_kirim date,
  p_slot_kirim text,
  p_catatan text,
  p_ucapan jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_set public.pengaturan_toko%rowtype;
  v_ongkir numeric(12, 0) := 0;
  v_subtotal numeric(12, 0) := 0;
  v_id_pesanan int;
  v_kode text;
  v_id_detail int;
  v_item record;
  v_ad record;
  v record;
  v_punya_kartu boolean;
  v_ucapan text;
  v_stok int;
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;
  if length(trim(coalesce(p_nama_penerima, ''))) < 2 then
    raise exception 'Nama penerima wajib diisi';
  end if;
  if coalesce(p_no_telp_penerima, '') !~ '^\+?[0-9]{8,14}$' then
    raise exception 'Nomor telepon penerima tidak valid';
  end if;

  perform private.validasi_jadwal(p_tanggal_kirim, p_slot_kirim, false);
  select * into v_set from public.pengaturan_toko where id = 1;

  if p_metode = 'kirim' then
    if length(trim(coalesce(p_alamat, ''))) < 10 then
      raise exception 'Alamat pengiriman wajib diisi lengkap';
    end if;
    select tarif into v_ongkir from public.zona_pengiriman where id_zona = p_id_zona and is_aktif;
    if not found then
      raise exception 'Alamat di luar zona pengiriman kami. Hubungi kami lewat WhatsApp.';
    end if;
  end if;

  if not exists (select 1 from public.keranjang_item where id_user = v_uid) then
    raise exception 'Keranjang masih kosong';
  end if;

  -- Kunci baris stok supaya dua pesanan tidak mengambil stok terakhir yang sama
  perform 1 from public.produk
  where id_produk in (select id_produk from public.keranjang_item where id_user = v_uid)
  order by id_produk
  for update;

  perform 1 from public.addon
  where id_addon in (
    select ka.id_addon
    from public.keranjang_addon ka
    join public.keranjang_item ki on ki.id_keranjang_item = ka.id_keranjang_item
    where ki.id_user = v_uid
  )
  order by id_addon
  for update;

  for v in
    select p.nama_produk, p.stok, p.is_aktif, k.total
    from (
      select id_produk, sum(jumlah)::int as total
      from public.keranjang_item where id_user = v_uid group by id_produk
    ) k
    join public.produk p on p.id_produk = k.id_produk
  loop
    if not v.is_aktif then
      raise exception 'Produk "%" sudah tidak tersedia', v.nama_produk;
    end if;
    if v.stok < v.total then
      raise exception 'Stok "%" tidak cukup (tersisa %)', v.nama_produk, v.stok;
    end if;
  end loop;

  for v in
    select a.nama_addon, a.stok, a.is_aktif, k.total
    from (
      select ka.id_addon, sum(ka.jumlah)::int as total
      from public.keranjang_addon ka
      join public.keranjang_item ki on ki.id_keranjang_item = ka.id_keranjang_item
      where ki.id_user = v_uid
      group by ka.id_addon
    ) k
    join public.addon a on a.id_addon = k.id_addon
  loop
    if not v.is_aktif then
      raise exception 'Addon "%" sudah tidak tersedia', v.nama_addon;
    end if;
    if v.stok < v.total then
      raise exception 'Stok addon "%" tidak cukup (tersisa %)', v.nama_addon, v.stok;
    end if;
  end loop;

  insert into public.pesanan (
    id_user, tipe_pesanan, nama_penerima, no_telp_penerima, metode_pengiriman,
    id_zona, alamat_pengiriman, tanggal_kirim, slot_kirim, catatan, ongkir, batas_bayar_at
  )
  values (
    v_uid, 'katalog', trim(p_nama_penerima), p_no_telp_penerima, p_metode,
    case when p_metode = 'kirim' then p_id_zona end,
    case when p_metode = 'kirim' then trim(p_alamat) end,
    p_tanggal_kirim, p_slot_kirim, nullif(trim(coalesce(p_catatan, '')), ''),
    v_ongkir, now() + make_interval(mins => v_set.batas_bayar_menit)
  )
  returning id_pesanan, kode_pesanan into v_id_pesanan, v_kode;

  for v_item in
    select ki.id_keranjang_item, ki.jumlah, p.id_produk, p.nama_produk, p.harga
    from public.keranjang_item ki
    join public.produk p on p.id_produk = ki.id_produk
    where ki.id_user = v_uid
    order by ki.id_keranjang_item
  loop
    v_punya_kartu := exists (
      select 1 from public.keranjang_addon ka
      join public.addon a on a.id_addon = ka.id_addon
      where ka.id_keranjang_item = v_item.id_keranjang_item and a.is_kartu_ucapan
    );
    v_ucapan := null;
    if v_punya_kartu then
      v_ucapan := nullif(left(trim(coalesce(p_ucapan ->> v_item.id_keranjang_item::text, '')), 300), '');
    end if;

    insert into public.detail_pesanan (id_pesanan, id_produk, nama_item, jumlah, harga_satuan, subtotal, ucapan_kartu)
    values (v_id_pesanan, v_item.id_produk, v_item.nama_produk, v_item.jumlah, v_item.harga, v_item.harga * v_item.jumlah, v_ucapan)
    returning id_detail into v_id_detail;
    v_subtotal := v_subtotal + v_item.harga * v_item.jumlah;

    for v_ad in
      select a.id_addon, a.nama_addon, a.harga, ka.jumlah
      from public.keranjang_addon ka
      join public.addon a on a.id_addon = ka.id_addon
      where ka.id_keranjang_item = v_item.id_keranjang_item
      order by a.id_addon
    loop
      insert into public.detail_addon (id_detail, id_addon, nama_addon, jumlah, harga_satuan, subtotal)
      values (v_id_detail, v_ad.id_addon, v_ad.nama_addon, v_ad.jumlah, v_ad.harga, v_ad.harga * v_ad.jumlah);
      v_subtotal := v_subtotal + v_ad.harga * v_ad.jumlah;
    end loop;
  end loop;

  -- Kurangi stok dan catat di log stok
  for v in
    select id_produk, sum(jumlah)::int as total
    from public.keranjang_item where id_user = v_uid group by id_produk order by id_produk
  loop
    update public.produk set stok = stok - v.total where id_produk = v.id_produk returning stok into v_stok;
    insert into public.log_stok (id_produk, id_pesanan, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (v.id_produk, v_id_pesanan, v_uid, 'keluar', v.total, v_stok + v.total, v_stok, 'Pesanan ' || v_kode);
  end loop;

  for v in
    select ka.id_addon, sum(ka.jumlah)::int as total
    from public.keranjang_addon ka
    join public.keranjang_item ki on ki.id_keranjang_item = ka.id_keranjang_item
    where ki.id_user = v_uid
    group by ka.id_addon
    order by ka.id_addon
  loop
    update public.addon set stok = stok - v.total where id_addon = v.id_addon returning stok into v_stok;
    insert into public.log_stok (id_addon, id_pesanan, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (v.id_addon, v_id_pesanan, v_uid, 'keluar', v.total, v_stok + v.total, v_stok, 'Pesanan ' || v_kode);
  end loop;

  update public.pesanan set subtotal = v_subtotal where id_pesanan = v_id_pesanan;

  insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
  values (v_id_pesanan, v_uid, 'belum_dibayar', 'Pesanan dibuat');

  delete from public.keranjang_item where id_user = v_uid;

  return jsonb_build_object(
    'id_pesanan', v_id_pesanan,
    'kode_pesanan', v_kode,
    'total_harga', v_subtotal + v_ongkir
  );
end;
$$;

-- Pesanan custom yang dibuat admin setelah deal lewat WhatsApp
create or replace function public.buat_pesanan_custom(
  p_id_user uuid,
  p_nama_item text,
  p_deskripsi text,
  p_harga numeric,
  p_jumlah int,
  p_addons jsonb,
  p_ucapan text,
  p_nama_penerima text,
  p_no_telp_penerima text,
  p_metode public.metode_pengiriman,
  p_id_zona int,
  p_alamat text,
  p_tanggal_kirim date,
  p_slot_kirim text,
  p_catatan text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_ongkir numeric(12, 0) := 0;
  v_subtotal numeric(12, 0) := 0;
  v_id_pesanan int;
  v_kode text;
  v_id_detail int;
  v record;
  v_punya_kartu boolean := false;
  v_stok int;
begin
  if not private.is_admin() then
    raise exception 'Akses ditolak';
  end if;
  if not exists (select 1 from public.profiles where id = p_id_user and role = 'customer') then
    raise exception 'Akun pelanggan tidak ditemukan';
  end if;
  if length(trim(coalesce(p_nama_item, ''))) < 3 then
    raise exception 'Nama item custom wajib diisi';
  end if;
  if p_harga is null or p_harga <= 0 or p_harga <> trunc(p_harga) then
    raise exception 'Harga harus berupa angka bulat lebih dari 0';
  end if;
  if p_jumlah is null or p_jumlah < 1 or p_jumlah > 99 then
    raise exception 'Jumlah harus antara 1 dan 99';
  end if;
  if length(trim(coalesce(p_nama_penerima, ''))) < 2 then
    raise exception 'Nama penerima wajib diisi';
  end if;
  if coalesce(p_no_telp_penerima, '') !~ '^\+?[0-9]{8,14}$' then
    raise exception 'Nomor telepon penerima tidak valid';
  end if;

  perform private.validasi_jadwal(p_tanggal_kirim, p_slot_kirim, true);

  if p_metode = 'kirim' then
    if length(trim(coalesce(p_alamat, ''))) < 10 then
      raise exception 'Alamat pengiriman wajib diisi lengkap';
    end if;
    select tarif into v_ongkir from public.zona_pengiriman where id_zona = p_id_zona and is_aktif;
    if not found then
      raise exception 'Zona pengiriman tidak valid';
    end if;
  end if;

  if jsonb_typeof(coalesce(p_addons, '[]'::jsonb)) <> 'array' then
    raise exception 'Format addon tidak valid';
  end if;

  perform 1 from public.addon
  where id_addon in (select (e ->> 'id_addon')::int from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) e)
  order by id_addon
  for update;

  for v in
    select a.id_addon, a.nama_addon, a.stok, a.is_aktif, a.is_kartu_ucapan, k.total
    from (
      select (e ->> 'id_addon')::int as id_addon, sum((e ->> 'jumlah')::int)::int as total
      from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) e
      group by 1
    ) k
    left join public.addon a on a.id_addon = k.id_addon
  loop
    if v.id_addon is null then
      raise exception 'Addon tidak ditemukan';
    end if;
    if v.total < 1 or v.total > 99 then
      raise exception 'Jumlah addon harus antara 1 dan 99';
    end if;
    if not v.is_aktif then
      raise exception 'Addon "%" sudah tidak tersedia', v.nama_addon;
    end if;
    if v.stok < v.total then
      raise exception 'Stok addon "%" tidak cukup (tersisa %)', v.nama_addon, v.stok;
    end if;
    if v.is_kartu_ucapan then
      v_punya_kartu := true;
    end if;
  end loop;

  insert into public.pesanan (
    id_user, tipe_pesanan, nama_penerima, no_telp_penerima, metode_pengiriman,
    id_zona, alamat_pengiriman, tanggal_kirim, slot_kirim, catatan, ongkir, batas_bayar_at, dibuat_oleh
  )
  values (
    p_id_user, 'custom', trim(p_nama_penerima), p_no_telp_penerima, p_metode,
    case when p_metode = 'kirim' then p_id_zona end,
    case when p_metode = 'kirim' then trim(p_alamat) end,
    p_tanggal_kirim, p_slot_kirim, nullif(trim(coalesce(p_catatan, '')), ''),
    v_ongkir, now() + interval '24 hours', v_admin
  )
  returning id_pesanan, kode_pesanan into v_id_pesanan, v_kode;

  insert into public.detail_pesanan (id_pesanan, id_produk, nama_item, deskripsi_custom, jumlah, harga_satuan, subtotal, ucapan_kartu)
  values (
    v_id_pesanan, null, trim(p_nama_item), nullif(trim(coalesce(p_deskripsi, '')), ''),
    p_jumlah, p_harga, p_harga * p_jumlah,
    case when v_punya_kartu then nullif(left(trim(coalesce(p_ucapan, '')), 300), '') end
  )
  returning id_detail into v_id_detail;
  v_subtotal := p_harga * p_jumlah;

  for v in
    select a.id_addon, a.nama_addon, a.harga, k.total
    from (
      select (e ->> 'id_addon')::int as id_addon, sum((e ->> 'jumlah')::int)::int as total
      from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) e
      group by 1
    ) k
    join public.addon a on a.id_addon = k.id_addon
    order by a.id_addon
  loop
    insert into public.detail_addon (id_detail, id_addon, nama_addon, jumlah, harga_satuan, subtotal)
    values (v_id_detail, v.id_addon, v.nama_addon, v.total, v.harga, v.harga * v.total);
    v_subtotal := v_subtotal + v.harga * v.total;

    update public.addon set stok = stok - v.total where id_addon = v.id_addon returning stok into v_stok;
    insert into public.log_stok (id_addon, id_pesanan, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (v.id_addon, v_id_pesanan, v_admin, 'keluar', v.total, v_stok + v.total, v_stok, 'Pesanan custom ' || v_kode);
  end loop;

  update public.pesanan set subtotal = v_subtotal where id_pesanan = v_id_pesanan;

  insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
  values (v_id_pesanan, v_admin, 'belum_dibayar', 'Pesanan custom dibuat admin');

  return jsonb_build_object(
    'id_pesanan', v_id_pesanan,
    'kode_pesanan', v_kode,
    'total_harga', v_subtotal + v_ongkir
  );
end;
$$;

-- Customer membatalkan pesanannya sendiri selama belum dibayar
create or replace function public.batalkan_pesanan_saya(p_id_pesanan int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pes public.pesanan%rowtype;
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;
  select * into v_pes from public.pesanan where id_pesanan = p_id_pesanan for update;
  if not found or v_pes.id_user <> v_uid then
    raise exception 'Pesanan tidak ditemukan';
  end if;
  if v_pes.status <> 'belum_dibayar' then
    raise exception 'Pesanan yang sudah dibayar tidak bisa dibatalkan sendiri. Hubungi admin.';
  end if;
  perform private.batalkan_pesanan(p_id_pesanan, v_uid, 'Dibatalkan oleh pelanggan', 'dibatalkan');
end;
$$;

-- Admin mengubah status pesanan sesuai aturan transisi
create or replace function public.ubah_status_pesanan(
  p_id_pesanan int,
  p_status public.status_pesanan,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_pes public.pesanan%rowtype;
  v_catatan text := nullif(trim(coalesce(p_catatan, '')), '');
  v_judul text;
  v_pesan text;
begin
  if not private.is_admin() then
    raise exception 'Akses ditolak';
  end if;
  select * into v_pes from public.pesanan where id_pesanan = p_id_pesanan for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;

  if p_status = 'dibatalkan' then
    if v_pes.status = 'diproses' and v_catatan is null then
      raise exception 'Alasan pembatalan wajib diisi';
    end if;
    perform private.batalkan_pesanan(p_id_pesanan, v_admin, coalesce(v_catatan, 'Dibatalkan oleh admin'), 'dibatalkan');
    return;
  end if;

  if not (
    (v_pes.status = 'diproses' and p_status = 'dikirim' and v_pes.metode_pengiriman = 'kirim')
    or (v_pes.status = 'diproses' and p_status = 'siap_diambil' and v_pes.metode_pengiriman = 'ambil')
    or (v_pes.status in ('dikirim', 'siap_diambil') and p_status = 'selesai')
  ) then
    raise exception 'Perubahan status tidak diizinkan';
  end if;

  update public.pesanan set status = p_status where id_pesanan = p_id_pesanan;

  insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
  values (p_id_pesanan, v_admin, p_status, v_catatan);

  if p_status = 'dikirim' then
    v_judul := 'Pesanan ' || v_pes.kode_pesanan || ' sedang dikirim';
    v_pesan := 'Buketmu sedang dalam perjalanan ke alamat penerima.';
  elsif p_status = 'siap_diambil' then
    v_judul := 'Pesanan ' || v_pes.kode_pesanan || ' siap diambil';
    v_pesan := 'Buketmu sudah siap. Silakan ambil di toko sesuai jadwal.';
  else
    v_judul := 'Pesanan ' || v_pes.kode_pesanan || ' selesai';
    v_pesan := 'Terima kasih sudah memesan. Semoga buketnya membawa senyum.';
  end if;

  insert into public.notifikasi (id_user, id_pesanan, tipe, judul, pesan, channel)
  values (v_pes.id_user, p_id_pesanan, 'status', v_judul, v_pesan, 'web');
end;
$$;

-- Admin menambah atau mengurangi stok secara manual
create or replace function public.sesuaikan_stok(
  p_jenis text,
  p_id int,
  p_delta int,
  p_keterangan text
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_lama int;
  v_baru int;
begin
  if not private.is_admin() then
    raise exception 'Akses ditolak';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Jumlah perubahan stok tidak boleh 0';
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

  if p_jenis = 'produk' then
    update public.produk set stok = v_baru where id_produk = p_id;
    insert into public.log_stok (id_produk, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (p_id, v_admin, case when p_delta > 0 then 'masuk'::public.tipe_log_stok else 'penyesuaian'::public.tipe_log_stok end,
            abs(p_delta), v_lama, v_baru, nullif(trim(coalesce(p_keterangan, '')), ''));
  else
    update public.addon set stok = v_baru where id_addon = p_id;
    insert into public.log_stok (id_addon, id_user, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan)
    values (p_id, v_admin, case when p_delta > 0 then 'masuk'::public.tipe_log_stok else 'penyesuaian'::public.tipe_log_stok end,
            abs(p_delta), v_lama, v_baru, nullif(trim(coalesce(p_keterangan, '')), ''));
  end if;

  return v_baru;
end;
$$;

-- Dipanggil webhook Midtrans (service role) saat pembayaran lunas. Aman dipanggil berulang.
create or replace function public.tandai_pembayaran_lunas(
  p_gateway_order_id text,
  p_transaction_id text,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bayar public.pembayaran%rowtype;
  v_pes public.pesanan%rowtype;
begin
  select * into v_bayar from public.pembayaran where gateway_order_id = p_gateway_order_id for update;
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;
  if v_bayar.status_bayar = 'lunas' then
    return jsonb_build_object('hasil', 'sudah_diproses', 'id_pesanan', v_bayar.id_pesanan);
  end if;

  update public.pembayaran
  set status_bayar = 'lunas',
      dibayar_at = now(),
      gateway_transaction_id = coalesce(p_transaction_id, gateway_transaction_id),
      raw_response = p_raw
  where id_pembayaran = v_bayar.id_pembayaran;

  select * into v_pes from public.pesanan where id_pesanan = v_bayar.id_pesanan for update;

  if v_pes.status <> 'belum_dibayar' then
    insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
    values (v_pes.id_pesanan, null, v_pes.status, 'Pembayaran diterima saat pesanan tidak lagi menunggu bayar. Perlu ditinjau admin.');
    return jsonb_build_object('hasil', 'perlu_tinjau', 'id_pesanan', v_pes.id_pesanan, 'kode_pesanan', v_pes.kode_pesanan);
  end if;

  update public.pesanan set status = 'diproses' where id_pesanan = v_pes.id_pesanan;

  update public.pembayaran
  set status_bayar = 'dibatalkan'
  where id_pesanan = v_pes.id_pesanan and status_bayar = 'menunggu';

  insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
  values (v_pes.id_pesanan, null, 'diproses', 'Pembayaran QRIS diterima');

  insert into public.notifikasi (id_user, id_pesanan, tipe, judul, pesan, channel)
  values (
    v_pes.id_user, v_pes.id_pesanan, 'pembayaran_berhasil',
    'Pembayaran ' || v_pes.kode_pesanan || ' berhasil',
    'Pembayaranmu sudah kami terima. Buketmu mulai kami siapkan.',
    'web'
  );

  insert into public.notifikasi (id_user, id_pesanan, tipe, judul, pesan, channel)
  select p.id, v_pes.id_pesanan, 'orderan_masuk',
         'Orderan masuk: ' || v_pes.kode_pesanan,
         'Pesanan atas nama ' || v_pes.nama_penerima || ' sudah dibayar dan siap diproses.',
         'web'
  from public.profiles p
  where p.role = 'admin';

  return jsonb_build_object('hasil', 'lunas', 'id_pesanan', v_pes.id_pesanan, 'kode_pesanan', v_pes.kode_pesanan);
end;
$$;

-- Dipanggil webhook Midtrans (service role) saat pembayaran kedaluwarsa, gagal, atau dibatalkan
create or replace function public.tandai_pembayaran_tidak_berhasil(
  p_gateway_order_id text,
  p_status public.status_bayar,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bayar public.pembayaran%rowtype;
  v_pes public.pesanan%rowtype;
begin
  if p_status not in ('kedaluwarsa', 'gagal', 'dibatalkan') then
    raise exception 'Status pembayaran tidak valid';
  end if;
  select * into v_bayar from public.pembayaran where gateway_order_id = p_gateway_order_id for update;
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;
  if v_bayar.status_bayar <> 'menunggu' then
    return jsonb_build_object('hasil', 'sudah_diproses', 'id_pesanan', v_bayar.id_pesanan);
  end if;

  update public.pembayaran
  set status_bayar = p_status, raw_response = p_raw
  where id_pembayaran = v_bayar.id_pembayaran;

  if p_status = 'kedaluwarsa' then
    select * into v_pes from public.pesanan where id_pesanan = v_bayar.id_pesanan for update;
    if v_pes.status = 'belum_dibayar' and v_pes.batas_bayar_at <= now() + interval '1 minute' then
      perform private.batalkan_pesanan(v_pes.id_pesanan, null, 'Batas waktu pembayaran habis', 'kedaluwarsa');
      return jsonb_build_object('hasil', 'pesanan_dibatalkan', 'id_pesanan', v_pes.id_pesanan);
    end if;
  end if;

  return jsonb_build_object('hasil', 'diperbarui', 'id_pesanan', v_bayar.id_pesanan);
end;
$$;

-- Pengaman kalau webhook expire tidak masuk: dijalankan pg_cron tiap 5 menit
create or replace function public.batalkan_pesanan_kedaluwarsa()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_jumlah int := 0;
begin
  for v in
    select id_pesanan from public.pesanan
    where status = 'belum_dibayar' and batas_bayar_at < now() - interval '3 minutes'
    order by id_pesanan
    for update skip locked
  loop
    perform private.batalkan_pesanan(v.id_pesanan, null, 'Batas waktu pembayaran habis', 'kedaluwarsa');
    v_jumlah := v_jumlah + 1;
  end loop;
  return v_jumlah;
end;
$$;
