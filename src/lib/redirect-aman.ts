/** Hanya izinkan path internal sebagai tujuan redirect setelah login. */
export function amankanNext(next: FormDataEntryValue | string | null | undefined, cadangan = "/"): string {
  if (typeof next !== "string" || next.length > 300) return cadangan;
  // Hanya path internal: diawali satu "/", tanpa spasi/karakter kontrol (browser membuang tab & newline,
  // sehingga "/\t/situs-lain.com" bisa berubah menjadi "//situs-lain.com"), tanpa backslash.
  if (!/^\/(?![\/\\])[^\s\\\x00-\x1f\x7f]*$/.test(next)) return cadangan;
  try {
    const url = new URL(next, "http://lokal.invalid");
    if (url.origin !== "http://lokal.invalid") return cadangan;
    return url.pathname + url.search + url.hash;
  } catch {
    return cadangan;
  }
}
