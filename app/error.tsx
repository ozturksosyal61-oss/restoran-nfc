 "use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Uygulama hatası:", error); }, [error]);

  return <main className="status-page"><div className="status-card">
    <span className="status-code">500</span><div className="eyebrow">BEKLENMEYEN HATA</div>
    <h1>Bir şeyler ters gitti.</h1>
    <p>Sayfayı yenilemeyi deneyin. Sorun devam ederse tekrar giriş yapın.</p>
    <div className="status-actions">
      <button type="button" onClick={() => reset()} className="landing-primary">Tekrar Dene →</button>
      <a href="/" className="landing-secondary">Ana Sayfa</a>
    </div>
  </div></main>;
}
