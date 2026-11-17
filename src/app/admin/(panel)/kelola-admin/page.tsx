import type { Metadata } from "next";
import { JudulHalaman } from "@/components/admin/ui-admin";
import { Kartu, Kosong, Lencana, kelasInput, kelasTombol } from "@/components/ui";
import { FormAdminBaru, TombolUbahPeran } from "@/components/admin/form-kelola-admin";
import { createClient } from "@/lib/supabase/server";
import { wajibAdminUtama } from "@/lib/auth";
import { tanggal } from "@/lib/format";
import type { Profil } from "@/lib/types";

export const metadata: Metadata = { title: "Kelola Admin" };

type Baris = Pick<Profil, "id" | "nama" | "email" | "role" | "is_admin_utama" | "created_at">;

function Inisial({ nama, email }: { nama: string; email: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose text-sm font-bold uppercase text-white">
      {(nama || email || "?").trim().charAt(0)}
    </span>
  );
}

export default async function KelolaAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [saya, { q: qMentah }] = await Promise.all([wajibAdminUtama(), searchParams]);
  // Karakter selain huruf/angka/spasi/@/./- dibuang supaya aman dipakai di filter pencarian
  const q = (qMentah ?? "").replace(/[^\w\s@.-]/g, "").trim().slice(0, 50);
  const supabase = await createClient();

  const kolom = "id, nama, email, role, is_admin_utama, created_at";
  const [{ data: admin }, { data: pelanggan }] = await Promise.all([
    supabase
      .from("profiles")
      .select(kolom)
      .eq("role", "admin")
      .order("is_admin_utama", { ascending: false })
      .order("created_at"),
    q
      ? supabase
          .from("profiles")
          .select(kolom)
          .eq("role", "customer")
          .or(`nama.ilike.%${q}%,email.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Baris[] }),
  ]);

  const daftarAdmin = (admin ?? []) as Baris[];
  const hasilCari = (pelanggan ?? []) as Baris[];

  return (
    <>
      <JudulHalaman
        judul="Kelola Admin"
        deskripsi="Tambahkan admin baru atau cabut akses admin. Hanya admin utama yang bisa membuka halaman ini."
      />

      <div className="grid max-w-4xl gap-6">
        {/* Daftar admin */}
        <Kartu>
          <h2 className="font-serif text-2xl font-bold">Admin saat ini</h2>
          <p className="mb-4 mt-1 text-sm text-abu">{daftarAdmin.length} akun admin.</p>
          <ul className="divide-y divide-garis/70">
            {daftarAdmin.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <Inisial nama={a.nama} email={a.email} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{a.nama || "Tanpa nama"}</span>
                    {a.is_admin_utama ? <Lencana warna="bg-rose text-white">Admin utama</Lencana> : <Lencana>Admin</Lencana>}
                    {a.id === saya.id ? <span className="text-xs font-normal text-abu">(kamu)</span> : null}
                  </p>
                  <p className="truncate text-sm text-abu">{a.email}</p>
                </div>
                {!a.is_admin_utama && a.id !== saya.id ? (
                  <div className="w-full sm:w-auto">
                    <TombolUbahPeran idUser={a.id} nama={a.nama || a.email} peran="customer" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Kartu>

        {/* Jadikan akun yang sudah ada sebagai admin */}
        <Kartu>
          <h2 className="font-serif text-2xl font-bold">Jadikan akun yang ada sebagai admin</h2>
          <p className="mb-4 mt-1 text-sm text-abu">
            Untuk orang yang sudah punya akun (daftar lewat email atau Google). Cari dengan nama atau email.
          </p>
          <form className="flex gap-3" role="search">
            <label htmlFor="q" className="sr-only">
              Cari akun pelanggan
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Nama atau email" className={kelasInput} />
            <button type="submit" className={kelasTombol("garis")}>
              Cari
            </button>
          </form>

          {q ? (
            hasilCari.length === 0 ? (
              <div className="mt-4">
                <Kosong judul="Akun tidak ditemukan">
                  Pastikan orangnya sudah daftar, atau buat akun admin baru di bawah.
                </Kosong>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-garis/70">
                {hasilCari.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Inisial nama={p.nama} email={p.email} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.nama || "Tanpa nama"}</p>
                      <p className="truncate text-sm text-abu">
                        {p.email} · daftar {tanggal(p.created_at)}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <TombolUbahPeran idUser={p.id} nama={p.nama || p.email} peran="admin" />
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </Kartu>

        {/* Buat akun admin baru */}
        <Kartu>
          <h2 className="font-serif text-2xl font-bold">Buat akun admin baru</h2>
          <p className="mb-4 mt-1 text-sm text-abu">
            Untuk orang yang belum punya akun. Akunnya langsung aktif sebagai admin dan bisa masuk di halaman Sign In Admin
            dengan email dan password sementara ini.
          </p>
          <FormAdminBaru />
        </Kartu>
      </div>
    </>
  );
}
