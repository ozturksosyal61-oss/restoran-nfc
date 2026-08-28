export default async function PaymentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="restaurant-page">
      <section className="hero">
        <div className="logo">OZT</div>

        <h1>OZT KAFE</h1>

        <p>Ödeme Yap</p>

        <span>İşletme: {slug}</span>
      </section>

      <section className="payment-section">
        <h2>Masa Ödemesi</h2>

        <div className="payment-info">
          <span>Toplam Tutar</span>
          <strong>850 TL</strong>
        </div>

        <button className="submit-button">
          Güvenli Ödeme
        </button>

        <p className="payment-note">
          Ödeme işlemi güvenli ödeme altyapısı üzerinden gerçekleştirilecektir.
        </p>
      </section>
    </main>
  );
}