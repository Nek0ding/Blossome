import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan class Tailwind. Kalau ada class yang bertabrakan (mis. `text-zaitun-tua` bawaan tombol
 * dan `text-white` dari pemanggil), yang ditulis belakangan yang dipakai. Tanpa ini, mana yang menang
 * bergantung pada urutan di file CSS, sehingga tampilan bisa tidak sesuai (mis. teks tak terlihat).
 */
export function cn(...kelas: ClassValue[]): string {
  return twMerge(clsx(kelas));
}
