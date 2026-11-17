"use client";

import { useEffect } from "react";

/** Cadangan terakhir kalau layout utama sendiri gagal dirender. */
export default function GalatGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fbf8f1", color: "#2e2e2b" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#b4456b", fontSize: 40, margin: 0 }}>Ada yang tidak beres</h1>
          <p style={{ maxWidth: 420, color: "#6b6b63" }}>Website gagal dimuat. Coba lagi beberapa saat.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "10px 24px", borderRadius: 999, border: 0, background: "#6f7b4b", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Coba Lagi
          </button>
        </main>
      </body>
    </html>
  );
}
