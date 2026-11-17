import "server-only";

type GalatDb = { code?: string; message?: string; details?: string | null } | null | undefined;

/**
 * Ubah error dari Supabase menjadi pesan yang aman ditampilkan.
 * Pesan dari `raise exception` di fungsi database kita (kode P0001) memang ditulis untuk pengguna,
 * jadi diteruskan apa adanya. Error lain (nama tabel, constraint, dll.) hanya dicatat di log server.
 */
export function pesanDb(error: GalatDb, cadangan = "Terjadi kesalahan. Coba lagi."): string {
  if (!error) return cadangan;
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "23505") return "Data dengan nama ini sudah ada. Gunakan nama lain.";
  if (error.code === "23503") return "Data ini masih dipakai oleh data lain.";
  if (error.code === "42501") return "Kamu tidak punya akses untuk melakukan aksi ini.";
  if (error.code === "22001") return "Ada isian yang terlalu panjang. Persingkat lalu coba lagi.";
  if (error.code === "23514") return "Ada isian yang formatnya tidak valid atau terlalu panjang.";
  if (error.code === "22P02") return "Ada isian yang formatnya tidak valid.";
  console.error("[db]", error.code, error.message, error.details ?? "");
  return cadangan;
}
