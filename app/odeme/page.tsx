"use client";

import { useEffect, useState } from "react";

type PaymentInfo = {
  checkout_reference: string;
  payment_id: string;
  restaurant: {
    id: number;
    name: string;
  };
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
  billing_interval: string;
};

export default function PaymentPage() {
  const [payment, setPayment] =
    useState<PaymentInfo | null>(null);

  const [cardName, setCardName] =
    useState("");

  const [cardNumber, setCardNumber] =
    useState("");

  const [expiry, setExpiry] =
    useState("");

  const [cvv, setCvv] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [checkoutStarted, setCheckoutStarted] =
    useState(false);

  const [activeSubscription, setActiveSubscription] =
    useState(false);

  const createCheckout = async () => {
    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const restaurantId =
        params.get(
          "restaurant_id"
        );

      const planId =
        params.get("plan_id");

      const interval =
        params.get(
          "billing_interval"
        ) || "monthly";

      if (
        !restaurantId ||
        !planId
      ) {
        setError(
          "Ödeme bilgileri eksik."
        );

        setLoading(false);
        return;
      }

      const response =
        await fetch(
          "/api/payment/demo/create",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              restaurant_id:
                restaurantId,

              plan_id:
                planId,

              billing_interval:
                interval,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const message =
          data.error ||
          "Ödeme başlatılamadı.";

        // Restoranın zaten aktif aboneliği varsa
        // ödeme formunu göstermiyoruz.
        if (
          response.status === 409 ||
          message
            .toLocaleLowerCase("tr-TR")
            .includes("aktif bir abonelik")
        ) {
          setActiveSubscription(true);
          setError("");
        } else {
          setError(message);
        }

        setLoading(false);
        return;
      }

      setPayment(data);
      setLoading(false);
    } catch (error) {
      console.error(error);

      setError(
        "Ödeme sistemiyle bağlantı kurulamadı."
      );

      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkoutStarted) return;

    setCheckoutStarted(true);
    createCheckout();
  }, [checkoutStarted]);

  const formatCardNumber =
    (value: string) => {
      const numbers =
        value.replace(
          /\D/g,
          ""
        ).slice(0, 16);

      return numbers
        .replace(
          /(.{4})/g,
          "$1 "
        )
        .trim();
    };

  const handlePayment =
    async () => {
      if (!payment) return;

      if (
        cardName.trim().length < 3
      ) {
        setError(
          "Kart üzerindeki adı gir."
        );
        return;
      }

      const cleanCard =
        cardNumber.replace(
          /\D/g,
          ""
        );

      if (
        cleanCard.length !== 16
      ) {
        setError(
          "Demo için 16 haneli kart numarası gir."
        );
        return;
      }

      if (
        expiry.length < 5
      ) {
        setError(
          "Son kullanma tarihini gir."
        );
        return;
      }

      if (
        cvv.length !== 3
      ) {
        setError(
          "3 haneli CVV gir."
        );
        return;
      }

      setProcessing(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/payment/demo/confirm",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                checkout_reference:
                  payment.checkout_reference,

                card_last_four:
                  cleanCard.slice(-4),
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.error ||
              "Ödeme başarısız."
          );

          setProcessing(false);
          return;
        }

        setSuccess(true);
        setProcessing(false);
      } catch (error) {
        console.error(error);

        setError(
          "Ödeme sırasında hata oluştu."
        );

        setProcessing(false);
      }
    };

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <main className="payment-page">
          <div className="loading">
            Ödeme sistemi hazırlanıyor...
          </div>
        </main>
      </>
    );
  }

  if (activeSubscription) {
    return (
      <>
        <style>{styles}</style>

        <main className="payment-page">
          <div className="active-card">
            <div className="active-icon">✓</div>

            <div className="brand">
              OZT DIGITAL
            </div>

            <h1>
              Aboneliğiniz <span>Aktif</span>
            </h1>

            <p>
              Bu restoranın zaten aktif bir aboneliği
              bulunuyor. Yeni bir ödeme başlatamazsınız.
            </p>

            <button
              onClick={() => {
                const params =
                  new URLSearchParams(
                    window.location.search
                  );

                const restaurantId =
                  params.get("restaurant_id");

                window.location.href =
                  restaurantId
                    ? `/abonelik?restaurant_id=${restaurantId}`
                    : "/abonelik";
              }}
            >
              ABONELİĞİ GÖR
            </button>

            <button
              className="secondary-button"
              onClick={() => {
                window.location.href = "/abonelik";
              }}
            >
              PAKETLERE DÖN
            </button>
          </div>
        </main>
      </>
    );
  }

  if (success) {
    return (
      <>
        <style>{styles}</style>

        <main className="payment-page">

          <div className="success-card">

            <div className="success-icon">
              ✓
            </div>

            <div className="brand">
              OZT DIGITAL
            </div>

            <h1>
              Ödeme Başarılı
            </h1>

            <p>
              Aboneliğiniz başarıyla
              aktifleştirildi.
            </p>

            <div className="success-plan">
              {payment?.plan.name}
            </div>

            <div className="success-price">
              {payment?.plan.price.toLocaleString(
                "tr-TR"
              )}{" "}
              TL /{" "}
              {payment?.billing_interval ===
              "monthly"
                ? "ay"
                : "yıl"}
            </div>

            <button
              onClick={() => {
                window.location.href =
                  `/abonelik?restaurant_id=${payment?.restaurant.id}`;
              }}
            >
              ABONELİĞİ GÖR
            </button>

          </div>

        </main>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <main className="payment-page">

        <div className="payment-container">

          <div className="brand">
            OZT DIGITAL
          </div>

          <h1>
            Güvenli Ödeme
          </h1>

          <p className="subtitle">
            Aboneliğinizi tamamlayın.
          </p>

          <div className="payment-grid">

            {/* FORM */}

            <div className="form-card">

              <button
                type="button"
                className="back-button"
                onClick={() => {
                  const params =
                    new URLSearchParams(
                      window.location.search
                    );

                  const restaurantId =
                    params.get("restaurant_id");

                  window.location.href =
                    restaurantId
                      ? `/abonelik?restaurant_id=${restaurantId}`
                      : "/abonelik";
                }}
              >
                ← Paketlere Dön
              </button>

              <h2>
                Kart Bilgileri
              </h2>

              <label>
                Kart Üzerindeki İsim
              </label>

              <input
                value={cardName}
                onChange={(e) =>
                  setCardName(
                    e.target.value
                  )
                }
                placeholder="TURAN ÖZTÜRK"
                autoComplete="cc-name"
              />

              <label>
                Kart Numarası
              </label>

              <input
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(
                    formatCardNumber(
                      e.target.value
                    )
                  )
                }
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
                autoComplete="cc-number"
              />

              <div className="row">

                <div>
                  <label>
                    Son Kullanma
                  </label>

                  <input
                    value={expiry}
                    onChange={(e) => {
                      let value =
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            4
                          );

                      if (
                        value.length >
                        2
                      ) {
                        value =
                          value.slice(
                            0,
                            2
                          ) +
                          "/" +
                          value.slice(
                            2
                          );
                      }

                      setExpiry(
                        value
                      );
                    }}
                    placeholder="MM/YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                  />
                </div>

                <div>
                  <label>
                    CVV
                  </label>

                  <input
                    value={cvv}
                    onChange={(e) =>
                      setCvv(
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            3
                          )
                      )
                    }
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                </div>

              </div>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <button
                onClick={
                  handlePayment
                }
                disabled={
                  processing || !payment
                }
              >
                {processing
                  ? "ÖDEME İŞLENİYOR..."
                  : "ÖDEMEYİ TAMAMLA"}
              </button>

              <div className="secure-note">
                Kart bilgileriniz bu demo sisteminde
                saklanmaz. Yalnızca son 4 hane ödeme
                kaydına işlenir.
              </div>

              <div className="demo-notice">
                DEMO ÖDEME MODU
              </div>

            </div>

            {/* SUMMARY */}

            <div className="summary">

              <div className="summary-title">
                Sipariş Özeti
              </div>

              <div className="restaurant-name">
                {payment?.restaurant.name}
              </div>

              <div className="plan-name">
                {payment?.plan.name}
              </div>

              <div className="trial-badge">
                14 GÜN ÜCRETSİZ DENEME
              </div>

              <div className="summary-line" />

              <div className="summary-row">
                <span>
                  Abonelik
                </span>

                <strong>
                  {payment?.billing_interval ===
                  "monthly"
                    ? "Aylık"
                    : "Yıllık"}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Tutar
                </span>

                <strong>
                  {payment?.plan.price.toLocaleString(
                    "tr-TR"
                  )}{" "}
                  TL
                </strong>
              </div>

              <div className="summary-line" />

              <div className="total">
                <span>
                  Toplam
                </span>

                <strong>
                  {payment?.plan.price.toLocaleString(
                    "tr-TR"
                  )}{" "}
                  TL
                </strong>
              </div>

            </div>

          </div>

        </div>

      </main>
    </>
  );
}

const styles = `

* {
  box-sizing: border-box;
}

.payment-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top,
      rgba(212,175,55,0.10),
      transparent 40%
    ),
    #080808;

  color: white;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  padding: 55px 20px;
}

.payment-container {
  max-width: 980px;
  margin: auto;
}

.brand {
  color: #d4af37;
  letter-spacing: .35em;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 14px;
}

.payment-container > h1 {
  font-size: 46px;
  margin: 0;
}

.subtitle {
  color: rgba(255,255,255,.45);
  margin: 10px 0 40px;
}

.payment-grid {
  display: grid;
  grid-template-columns:
    1.35fr .75fr;
  gap: 22px;
}

.form-card,
.summary {
  border:
    1px solid
    rgba(255,255,255,.10);

  background:
    rgba(255,255,255,.035);

  border-radius: 25px;
  padding: 30px;
}

.form-card h2 {
  margin-top: 18px;
  margin-bottom: 27px;
}

.back-button {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,.45);
  padding: 0;
  font-size: 12px;
  cursor: pointer;
}

.back-button:hover {
  color: #d4af37;
}

label {
  display: block;

  color:
    rgba(255,255,255,.55);

  font-size: 12px;

  margin-bottom: 7px;
}

input {
  width: 100%;

  background:
    rgba(255,255,255,.055);

  border:
    1px solid
    rgba(255,255,255,.10);

  color: white;

  border-radius: 12px;

  padding: 14px;

  margin-bottom: 18px;

  outline: none;

  font-size: 14px;
}

input:focus {
  border-color: #d4af37;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-card button,
.success-card button {
  width: 100%;

  border: 0;

  background: #d4af37;
  color: #080808;

  padding: 16px;

  border-radius: 13px;

  font-weight: 800;

  cursor: pointer;
}

.form-card button:disabled {
  opacity: .5;
}

.error {
  color: #ff8f8f;

  background:
    rgba(255,80,80,.08);

  border:
    1px solid
    rgba(255,80,80,.2);

  padding: 12px;

  border-radius: 10px;

  font-size: 12px;

  margin-bottom: 15px;
}

.secure-note {
  text-align: center;
  color: rgba(255,255,255,.28);
  font-size: 10px;
  line-height: 1.5;
  margin-top: 13px;
}

.demo-notice {
  text-align: center;

  color:
    rgba(255,255,255,.25);

  font-size: 9px;

  letter-spacing: .18em;

  margin-top: 10px;
}

.trial-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 14px;
  padding: 8px 11px;
  border-radius: 999px;
  background: rgba(212,175,55,.10);
  border: 1px solid rgba(212,175,55,.20);
  color: #d4af37;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .08em;
}

.summary-title {
  color:
    rgba(255,255,255,.40);

  font-size: 12px;

  text-transform: uppercase;

  letter-spacing: .1em;
}

.restaurant-name {
  font-size: 22px;
  font-weight: 700;
  margin-top: 18px;
}

.plan-name {
  color: #d4af37;
  font-size: 16px;
  margin-top: 7px;
}

.summary-line {
  height: 1px;

  background:
    rgba(255,255,255,.08);

  margin: 25px 0;
}

.summary-row,
.total {
  display: flex;
  justify-content: space-between;

  color:
    rgba(255,255,255,.45);

  font-size: 13px;

  margin-bottom: 15px;
}

.summary-row strong {
  color: white;
}

.total {
  color: white;
  font-size: 17px;
}

.total strong {
  color: #d4af37;
}

.loading {
  min-height: 70vh;

  display: flex;

  align-items: center;
  justify-content: center;

  color:
    rgba(255,255,255,.40);
}

.active-card {
  max-width: 620px;

  margin:
    80px auto;

  text-align: center;

  border:
    1px solid
    rgba(212,175,55,.35);

  border-radius: 28px;

  background:
    rgba(255,255,255,.035);

  padding: 50px 45px;
}

.active-icon {
  width: 70px;
  height: 70px;

  border-radius: 50%;

  background: #d4af37;
  color: #080808;

  display: flex;
  align-items: center;
  justify-content: center;

  margin: 0 auto 25px;

  font-size: 32px;
  font-weight: 800;
}

.active-card h1 {
  font-size: 36px;
  margin: 0 0 18px;
}

.active-card h1 span {
  color: #d4af37;
}

.active-card p {
  max-width: 470px;
  margin: 0 auto 30px;

  color:
    rgba(255,255,255,.50);

  line-height: 1.6;
}

.active-card button {
  width: 100%;

  border: 0;

  background: #d4af37;
  color: #080808;

  padding: 16px;

  border-radius: 13px;

  font-weight: 800;

  cursor: pointer;
}

.active-card .secondary-button {
  margin-top: 10px;

  background: transparent;
  color: #d4af37;

  border:
    1px solid
    rgba(212,175,55,.35);
}

.success-card {
  max-width: 500px;

  margin:
    80px auto;

  text-align: center;

  border:
    1px solid
    rgba(212,175,55,.35);

  border-radius: 28px;

  background:
    rgba(255,255,255,.035);

  padding: 45px;
}

.success-icon {
  width: 65px;
  height: 65px;

  border-radius: 50%;

  background: #d4af37;
  color: #080808;

  display: flex;
  align-items: center;
  justify-content: center;

  margin: 0 auto 25px;

  font-size: 30px;
  font-weight: 800;
}

.success-card h1 {
  font-size: 34px;
}

.success-card p {
  color:
    rgba(255,255,255,.45);
}

.success-plan {
  margin-top: 25px;

  font-size: 20px;
  font-weight: 700;
}

.success-price {
  color: #d4af37;
  margin: 10px 0 30px;
}

@media(max-width:800px) {

  .payment-page {
    padding: 30px 14px;
  }

  .payment-container > h1 {
    font-size: 34px;
  }

  .payment-grid {
    grid-template-columns: 1fr;
  }

  .form-card,
  .summary,
  .active-card {
    padding: 22px;
    border-radius: 20px;
  }

  .active-card h1 {
    font-size: 30px;
  }

  .row {
    gap: 10px;
  }

}

`;