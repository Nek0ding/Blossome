import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amankanNext } from "@/lib/auth";

/** Tujuan redirect setelah login Google: tukar kode dengan sesi. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const kode = searchParams.get("code");
  const next = amankanNext(searchParams.get("next"));
  const keAdmin = next === "/admin" || next.startsWith("/admin/");
  const halamanMasuk = keAdmin ? "/admin/masuk" : "/masuk";

  if (kode) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(kode);
    if (!error && data.user) {
      if (keAdmin) {
        // Masuk dari halaman admin: hanya akun admin yang boleh lanjut.
        const { data: profil } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        if (profil?.role !== "admin") {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/admin/masuk?galat=bukan-admin`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}${halamanMasuk}?galat=google`);
}
