-- Blossomé: pengamanan tambahan (race condition, hak akses kolom, batas keranjang, indeks)

-- 1) Fungsi yang diperbarui
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

  -- Satu checkout per pelanggan pada satu waktu. Mencegah klik ganda membuat pesanan kosong
  -- (checkout kedua menunggu di sini, lalu melihat keranjang sudah kosong).
  perform pg_advisory_xact_lock(hashtextextended('blossome:checkout:' || v_uid::text, 0));
  -- Kunci isi keranjang supaya tidak bisa diubah, dihapus, atau ditambah addon selama checkout berjalan
  perform 1 from public.keranjang_item where id_user = v_uid order by id_keranjang_item for update;

  -- Cegah stok "ditahan" oleh banyak pesanan yang tidak dibayar
  if (select count(*) from public.pesanan where id_user = v_uid and status = 'belum_dibayar') >= 3 then
    raise exception 'Kamu masih punya 3 pesanan yang belum dibayar. Bayar atau batalkan dulu sebelum membuat pesanan baru.';
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
  v_id_pesanan int;
begin
  -- Urutan kunci: pesanan dulu, baru pembayaran (sama seperti pembatalan) supaya tidak deadlock
  select id_pesanan into v_id_pesanan from public.pembayaran where gateway_order_id = p_gateway_order_id;
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;
  select * into v_pes from public.pesanan where id_pesanan = v_id_pesanan for update;
  select * into v_bayar from public.pembayaran where gateway_order_id = p_gateway_order_id for update;
  if v_bayar.status_bayar = 'lunas' then
    return jsonb_build_object('hasil', 'sudah_diproses', 'id_pesanan', v_bayar.id_pesanan);
  end if;

  update public.pembayaran
  set status_bayar = 'lunas',
      dibayar_at = now(),
      gateway_transaction_id = coalesce(p_transaction_id, gateway_transaction_id),
      raw_response = p_raw
  where id_pembayaran = v_bayar.id_pembayaran;

  if v_pes.status <> 'belum_dibayar' then
    insert into public.riwayat_status (id_pesanan, id_user, status, catatan)
    values (v_pes.id_pesanan, null, v_pes.status, 'Pembayaran diterima saat pesanan tidak lagi menunggu bayar. Perlu ditinjau admin.');
    insert into public.notifikasi (id_user, id_pesanan, tipe, judul, pesan, channel)
    select p.id, v_pes.id_pesanan, 'status',
           'Perlu ditinjau: ' || v_pes.kode_pesanan,
           'Ada pembayaran QRIS masuk untuk pesanan berstatus ' || v_pes.status || '. Cek dan lakukan refund bila perlu.',
           'web'
    from public.profiles p
    where p.role = 'admin';
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
  v_id_pesanan int;
begin
  if p_status not in ('kedaluwarsa', 'gagal', 'dibatalkan') then
    raise exception 'Status pembayaran tidak valid';
  end if;
  select id_pesanan into v_id_pesanan from public.pembayaran where gateway_order_id = p_gateway_order_id;
  if not found then
    return jsonb_build_object('hasil', 'tidak_ditemukan');
  end if;
  select * into v_pes from public.pesanan where id_pesanan = v_id_pesanan for update;
  select * into v_bayar from public.pembayaran where gateway_order_id = p_gateway_order_id for update;
  if v_bayar.status_bayar <> 'menunggu' then
    return jsonb_build_object('hasil', 'sudah_diproses', 'id_pesanan', v_bayar.id_pesanan);
  end if;

  update public.pembayaran
  set status_bayar = p_status, raw_response = p_raw
  where id_pembayaran = v_bayar.id_pembayaran;

  if p_status = 'kedaluwarsa' then
    if v_pes.status = 'belum_dibayar' and v_pes.batas_bayar_at <= now() + interval '1 minute' then
      perform private.batalkan_pesanan(v_pes.id_pesanan, null, 'Batas waktu pembayaran habis', 'kedaluwarsa');
      return jsonb_build_object('hasil', 'pesanan_dibatalkan', 'id_pesanan', v_pes.id_pesanan);
    end if;
  end if;

  return jsonb_build_object('hasil', 'diperbarui', 'id_pesanan', v_bayar.id_pesanan);
end;
$$;

-- 2) Stok hanya boleh berubah lewat fungsi (sesuaikan_stok, checkout, pembatalan) supaya selalu tercatat di log_stok
revoke insert, update on public.produk, public.addon from authenticated;
grant insert (id_kategori, nama_produk, slug, deskripsi, komposisi, harga, stok_minimum, gambar, is_aktif, is_best_seller)
  on public.produk to authenticated;
grant update (id_kategori, nama_produk, slug, deskripsi, komposisi, harga, stok_minimum, gambar, is_aktif, is_best_seller)
  on public.produk to authenticated;
grant insert (nama_addon, harga, stok_minimum, gambar, is_aktif, is_kartu_ucapan) on public.addon to authenticated;
grant update (nama_addon, harga, stok_minimum, gambar, is_aktif, is_kartu_ucapan) on public.addon to authenticated;

-- 3) Keranjang: hanya produk/addon aktif, dan maksimal 30 item per pelanggan
drop policy "keranjang milik sendiri" on public.keranjang_item;
create policy "lihat keranjang sendiri" on public.keranjang_item
  for select to authenticated using (id_user = (select auth.uid()));
create policy "tambah keranjang sendiri" on public.keranjang_item
  for insert to authenticated
  with check (
    id_user = (select auth.uid())
    and exists (select 1 from public.produk p where p.id_produk = keranjang_item.id_produk and p.is_aktif)
  );
create policy "ubah keranjang sendiri" on public.keranjang_item
  for update to authenticated
  using (id_user = (select auth.uid()))
  with check (id_user = (select auth.uid()));
create policy "hapus keranjang sendiri" on public.keranjang_item
  for delete to authenticated using (id_user = (select auth.uid()));
revoke update on public.keranjang_item from authenticated;
grant update (jumlah) on public.keranjang_item to authenticated;

drop policy "addon keranjang milik sendiri" on public.keranjang_addon;
create policy "lihat addon keranjang sendiri" on public.keranjang_addon
  for select to authenticated
  using (exists (
    select 1 from public.keranjang_item ki
    where ki.id_keranjang_item = keranjang_addon.id_keranjang_item and ki.id_user = (select auth.uid())
  ));
create policy "tambah addon keranjang sendiri" on public.keranjang_addon
  for insert to authenticated
  with check (
    exists (
      select 1 from public.keranjang_item ki
      where ki.id_keranjang_item = keranjang_addon.id_keranjang_item and ki.id_user = (select auth.uid())
    )
    and exists (select 1 from public.addon a where a.id_addon = keranjang_addon.id_addon and a.is_aktif)
  );
create policy "hapus addon keranjang sendiri" on public.keranjang_addon
  for delete to authenticated
  using (exists (
    select 1 from public.keranjang_item ki
    where ki.id_keranjang_item = keranjang_addon.id_keranjang_item and ki.id_user = (select auth.uid())
  ));
revoke update on public.keranjang_addon from authenticated;

create or replace function private.batasi_keranjang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger keranjang_item_batas
  before insert on public.keranjang_item
  for each row execute function private.batasi_keranjang();

-- 4) Indeks untuk laporan, dashboard, daftar pesanan, dan notifikasi
create index if not exists pembayaran_lunas_dibayar_idx on public.pembayaran (dibayar_at) where status_bayar = 'lunas';
create index if not exists pesanan_created_at_idx on public.pesanan (created_at desc);
create index if not exists pesanan_user_created_idx on public.pesanan (id_user, created_at desc);
create index if not exists notifikasi_user_created_idx on public.notifikasi (id_user, created_at desc);
create index if not exists produk_aktif_idx on public.produk (is_aktif, id_kategori);

-- 5) Tambah ke keranjang secara atomik (item + addon dalam satu transaksi).
--    SECURITY INVOKER: tetap tunduk pada RLS dan batas keranjang di atas.
create or replace function public.tambah_keranjang(p_id_produk int, p_jumlah int, p_addons jsonb default '[]'::jsonb)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id int;
  v_stok int;
  v_aktif boolean;
  e jsonb;
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;
  if p_jumlah is null or p_jumlah < 1 or p_jumlah > 99 then
    raise exception 'Jumlah harus antara 1 dan 99';
  end if;
  select stok, is_aktif into v_stok, v_aktif from public.produk where id_produk = p_id_produk;
  if not found or not v_aktif then
    raise exception 'Produk ini sudah tidak tersedia';
  end if;
  if v_stok < p_jumlah then
    raise exception 'Stok tinggal %. Kurangi jumlahnya.', v_stok;
  end if;
  if jsonb_typeof(coalesce(p_addons, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_addons, '[]'::jsonb)) > 20 then
    raise exception 'Format addon tidak valid';
  end if;

  insert into public.keranjang_item (id_user, id_produk, jumlah)
  values (v_uid, p_id_produk, p_jumlah)
  returning id_keranjang_item into v_id;

  for e in select * from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) loop
    if (e ->> 'jumlah')::int not between 1 and 99 then
      raise exception 'Jumlah addon harus antara 1 dan 99';
    end if;
    select stok, is_aktif into v_stok, v_aktif from public.addon where id_addon = (e ->> 'id_addon')::int;
    if not found or not v_aktif then
      raise exception 'Addon tidak tersedia';
    end if;
    if v_stok < (e ->> 'jumlah')::int then
      raise exception 'Stok addon tinggal %.', v_stok;
    end if;
    insert into public.keranjang_addon (id_keranjang_item, id_addon, jumlah)
    values (v_id, (e ->> 'id_addon')::int, (e ->> 'jumlah')::int);
  end loop;

  return v_id;
end;
$$;
revoke all on function public.tambah_keranjang(int, int, jsonb) from public, anon;
grant execute on function public.tambah_keranjang(int, int, jsonb) to authenticated;
