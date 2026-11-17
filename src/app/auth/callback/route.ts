import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amankanNext } from "@/lib/auth";

/** Tujuan redirect setelah login Google: tukar kode dengan sesi. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const kode = searchParams.get("code");
  const next = amankanNext(searchParams.get("next"));

  if (kode) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(kode);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/masuk?galat=google`);
}
