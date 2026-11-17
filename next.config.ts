import type { NextConfig } from "next";

// Optimasi gambar hanya untuk Storage project Supabase kita sendiri (bukan semua *.supabase.co),
// supaya server tidak bisa dipakai sebagai proxy gambar untuk situs lain.
const hostSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const HEADER_KEAMANAN = [
  // Halaman tidak boleh dimuat di dalam iframe situs lain (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: HEADER_KEAMANAN }];
  },
  // Semua halaman memakai data per pengguna (sesi, keranjang, pesanan),
  // jadi dirender dinamis per request tanpa Cache Components.
  cacheComponents: false,
  experimental: {
    // Foto produk maksimal 2 MB, ditambah ruang untuk overhead multipart.
    serverActions: { bodySizeLimit: "3mb" },
  },
  images: {
    // AVIF/WebP lebih kecil dari JPG. Nama file gambar selalu unik, jadi aman di-cache lama.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: hostSupabase
      ? (["produk", "addon"] as const).map((bucket) => ({
          protocol: "https" as const,
          hostname: hostSupabase,
          pathname: `/storage/v1/object/public/${bucket}/**`,
        }))
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
