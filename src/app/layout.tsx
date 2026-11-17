import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/cormorant-garamond/700-italic.css";
import "@fontsource/herr-von-muellerhoff";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blossomé — Florist & Bouquet Depok",
    template: "%s · Blossomé",
  },
  description:
    "Florist di Depok. Buket bunga segar, bloom box, dan rangkaian custom untuk wisuda, ulang tahun, dan momen spesial lainnya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
