import Link from "next/link";

export default function NotFound() {
  return <main className="status-page"><div className="status-card">
    <span className="status-code">404</span><div className="eyebrow">SAYFA BULUNAMADI</div>
    <h1>Aradığınız sayfayı bulamadık.</h1>
    <p>Adres değişmiş, kaldırılmış veya yanlış yazılmış olabilir.</p>
    <Link href="/" className="landing-primary">Ana Sayfaya Dön →</Link>
  </div></main>;
}
