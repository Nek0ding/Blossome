import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const BUTUH_LOGIN = ["/keranjang", "/checkout", "/pesanan", "/notifikasi", "/akun"];

function cocok(path: string, awalan: string) {
  return path === awalan || path.startsWith(awalan + "/");
}

/**
 * Memperbarui sesi Supabase di setiap request dan mengarahkan pengunjung
 * yang belum login keluar dari halaman yang butuh akun.
 * Pengecekan peran admin dilakukan lagi di layout admin dan di setiap server action.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([nama, nilai]) => response.headers.set(nama, nilai));
      },
    },
  });

  // Jangan taruh kode lain di antara createServerClient dan getClaims.
  // Kalau Supabase sedang tidak terjangkau, anggap belum login (halaman publik tetap tampil, bukan error 500).
  let sudahLogin = false;
  try {
    const { data } = await supabase.auth.getClaims();
    sudahLogin = Boolean(data?.claims?.sub);
  } catch (err) {
    console.error("[proxy] gagal membaca sesi:", err instanceof Error ? err.message : err);
  }

  const path = request.nextUrl.pathname;
  const areaAdmin = cocok(path, "/admin") && path !== "/admin/masuk";
  const areaCustomer = BUTUH_LOGIN.some((awalan) => cocok(path, awalan));

  if (!sudahLogin && (areaAdmin || areaCustomer)) {
    const tujuan = request.nextUrl.clone();
    tujuan.pathname = areaAdmin ? "/admin/masuk" : "/masuk";
    tujuan.search = "";
    if (areaCustomer) tujuan.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(tujuan);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Semua path kecuali file statis, gambar, dan webhook Midtrans.
    "/((?!_next/static|_next/image|favicon.ico|api/midtrans|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
