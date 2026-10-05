"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/report-client-error";

// Kök düzen dahil her şey çöktüğünde gösterilen son ekran.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f5ef", color: "#1a1814", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>Bir şeyler ters gitti.</h1>
          <p style={{ margin: "0 0 20px", color: "#5f5a53", lineHeight: 1.6 }}>Sayfayı yenilemeyi deneyin. Sorun kaydedildi.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: "12px 20px", border: 0, borderRadius: 12, background: "#1a1814", color: "#fff", fontSize: 15, cursor: "pointer" }}
          >
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
