import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { amankanNext } from "@/lib/auth";

const TIPE_OTP: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite", "magiclink"];

/**
 * Tujuan link di email Supabase (kalau template memakai link, bukan kode OTP):
 * /auth/confirm?token_hash=...&type=email|recovery&next=/
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const tipeMentah = searchParams.get("type");
  const tipe = TIPE_OTP.includes(tipeMentah as EmailOtpType) ? (tipeMentah as EmailOtpType) : null;
  const kode = searchParams.get("code");
  const next = amankanNext(searchParams.get("next"));
  const supabase = await createClient();

  if (tokenHash && tipe) {
    const { error } = await supabase.auth.verifyOtp({ type: tipe, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (kode) {
    const { error } = await supabase.auth.exchangeCodeForSession(kode);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/masuk?galat=tautan`);
}
