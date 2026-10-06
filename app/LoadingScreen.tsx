// Uygulama bölümlerinin (işletme paneli, sistem paneli, personel ekranı,
// restoran sayfaları) yükleme ekranı. Tanıtım sayfalarında kullanılmaz:
// orada içerik HTML'de doğrudan görünmeli (arama motorları).
export default function Loading() {
  return <main className="status-page" aria-label="Yükleniyor"><div className="loading-card">
    <div className="loading-logo">OZT</div><div className="loading-spinner" />
    <strong>Yükleniyor</strong><span>Lütfen bekleyin...</span>
  </div></main>;
}
