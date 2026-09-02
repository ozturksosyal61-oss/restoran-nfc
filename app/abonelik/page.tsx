"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  trial_days: number;
  features: string[];
};

type Subscription = {
  id: string;
  restaurant_id: number;
  status: string;
  billing_interval: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  subscription_plans?: {
    name: string;
    slug: string;
  };
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  const [selectedInterval, setSelectedInterval] =
    useState<"monthly" | "yearly">("monthly");

  const [selectedPlan, setSelectedPlan] =
    useState<string | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [message, setMessage] = useState("");

  const [apiError, setApiError] = useState("");

  // -------------------------------------------------------
  // RESTAURANT ID
  // -------------------------------------------------------

  const getRestaurantId = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    return params.get("restaurant_id");
  };

  // -------------------------------------------------------
  // PLANLARI GETİR
  // -------------------------------------------------------

  const loadPlans = async () => {
    try {
      const response = await fetch(
        "/api/subscription/plans",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      console.log("PLANS API:", data);

      if (!response.ok || !data.success) {
        setApiError(
          data.error ||
            "Paketler alınamadı."
        );

        return;
      }

      setPlans(data.plans || []);

      if (data.plans?.length > 0) {
        const params =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;

        const planFromUrl =
          params?.get("plan_id") || "";

        const planExists =
          data.plans.some(
            (plan: Plan) =>
              String(plan.id) ===
              String(planFromUrl)
          );

        const professional =
          data.plans.find(
            (plan: Plan) =>
              plan.slug === "profesyonel"
          );

        setSelectedPlan(
          planExists
            ? planFromUrl
            : professional?.id ||
              data.plans[0].id
        );
      }
    } catch (error) {
      console.error(
        "PLAN LOAD ERROR:",
        error
      );

      setApiError(
        "Paket sunucusuna bağlanılamadı."
      );
    }
  };

  // -------------------------------------------------------
  // ABONELİK
  // -------------------------------------------------------

  const loadSubscription = async () => {
    const restaurantId =
      getRestaurantId();

    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/subscription/status?restaurant_id=${encodeURIComponent(
          restaurantId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      console.log(
        "SUBSCRIPTION STATUS:",
        data
      );

      if (
        data.success &&
        data.subscription
      ) {
        setSubscription(
          data.subscription
        );
      }
    } catch (error) {
      console.error(
        "SUBSCRIPTION ERROR:",
        error
      );
    }

    setLoading(false);
  };

  // -------------------------------------------------------
  // INIT
  // -------------------------------------------------------

  useEffect(() => {
    const init = async () => {
      await loadPlans();
      await loadSubscription();
      setLoading(false);
    };

    init();
  }, []);

  // -------------------------------------------------------
  // 14 GÜN ÜCRETSİZ DENEMEYİ BAŞLAT
  // -------------------------------------------------------

  const startTrial = async () => {
    const restaurantId =
      getRestaurantId();

    if (!restaurantId) {
      const params = new URLSearchParams(
        window.location.search
      );

      const planId =
        selectedPlan ||
        params.get("plan_id") ||
        "";

      const interval =
        selectedInterval ||
        params.get("billing_interval") ||
        "monthly";

      const registerUrl =
        `/kayit?plan_id=${encodeURIComponent(
          planId
        )}` +
        `&billing_interval=${encodeURIComponent(
          interval
        )}`;

      window.location.href =
        registerUrl;

      return;
    }

    if (!selectedPlan) {
      setMessage(
        "Lütfen bir paket seç."
      );
      return;
    }

    setStarting(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/subscription/start",
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
              selectedPlan,
            billing_interval:
              selectedInterval,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "START SUBSCRIPTION:",
        data
      );

      if (!response.ok) {
        setMessage(
          data.error ||
            "Ücretsiz deneme başlatılamadı."
        );
        return;
      }

      // API başarılı olsa bile response içindeki
      // subscription nesnesine güvenmek yerine,
      // veritabanındaki güncel aboneliği tekrar çekiyoruz.
      // Böylece aktif ekranı kesin olarak gösteriyoruz.
      const statusResponse = await fetch(
        `/api/subscription/status?restaurant_id=${encodeURIComponent(
          restaurantId
        )}`,
        {
          cache: "no-store",
        }
      );

      const statusData =
        await statusResponse.json();

      console.log(
        "SUBSCRIPTION AFTER TRIAL:",
        statusData
      );

      if (
        !statusResponse.ok ||
        !statusData.success ||
        !statusData.subscription
      ) {
        setMessage(
          "Deneme isteği başarılı görünüyor ancak abonelik bilgisi tekrar alınamadı. Sayfayı yenileyip tekrar kontrol edin."
        );
        return;
      }

      setSubscription(
        statusData.subscription
      );
      setChangingPlan(false);
      setMessage("");
    } catch (error) {
      console.error(
        "START TRIAL ERROR:",
        error
      );

      setMessage(
        "Sunucuya bağlanırken hata oluştu."
      );
    } finally {
      setStarting(false);
    }
  };

  // -------------------------------------------------------
  // PAKET DEĞİŞTİRME / ÖDEME
  // -------------------------------------------------------

  const goToPayment = () => {
    const restaurantId =
      getRestaurantId();

    if (!restaurantId) {
      setMessage(
        "Restaurant ID bulunamadı."
      );
      return;
    }

    if (!selectedPlan) {
      setMessage(
        "Lütfen bir paket seç."
      );
      return;
    }

    setStarting(true);
    setMessage("");

    const paymentUrl =
      `/odeme?restaurant_id=${encodeURIComponent(
        restaurantId
      )}` +
      `&plan_id=${encodeURIComponent(
        selectedPlan
      )}` +
      `&billing_interval=${encodeURIComponent(
        selectedInterval
      )}` +
      "&change_plan=true";

    window.location.href =
      paymentUrl;
  };

  // -------------------------------------------------------
  // ANA AKSİYON
  // -------------------------------------------------------

  const handleSubscriptionAction = () => {
    if (changingPlan) {
      goToPayment();
      return;
    }

    const restaurantId = getRestaurantId();

    if (!restaurantId) {
      const params = new URLSearchParams(
        window.location.search
      );

      const planId =
        selectedPlan ||
        params.get("plan_id") ||
        "";

      const interval =
        selectedInterval ||
        params.get("billing_interval") ||
        "monthly";

      window.location.href =
        `/kayit?plan_id=${encodeURIComponent(
          planId
        )}` +
        `&billing_interval=${encodeURIComponent(
          interval
        )}`;

      return;
    }

    startTrial();
  };

  // -------------------------------------------------------
  // ABONELİĞİ İPTAL ET
  // -------------------------------------------------------

  const cancelSubscription = async () => {
    const restaurantId = getRestaurantId();

    if (!restaurantId || !subscription) return;

    const confirmed = window.confirm(
      "Aboneliği hemen iptal etmek istediğinize emin misiniz?"
    );

    if (!confirmed) return;

    setCancelling(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/subscription/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            "Abonelik iptal edilemedi."
        );
        return;
      }

      setSubscription(null);
      setChangingPlan(false);
      setMessage(
        "Aboneliğiniz iptal edildi. Yeni bir paket seçebilirsiniz."
      );
    } catch (error) {
      console.error(
        "CANCEL SUBSCRIPTION ERROR:",
        error
      );
      setMessage(
        "Abonelik iptal edilirken bir hata oluştu."
      );
    } finally {
      setCancelling(false);
    }
  };

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <main className="subscription-page">
          <div className="loading-box">
            <div className="logo-small">
              OZT DIGITAL
            </div>

            <div className="loading-text">
              Abonelik sistemi yükleniyor...
            </div>
          </div>
        </main>
      </>
    );
  }

  // -------------------------------------------------------
  // AKTİF ABONELİK
  // -------------------------------------------------------

  if (subscription) {
    const endDate =
      subscription.trial_ends_at ||
      subscription.current_period_end;

    return (
      <>
        <style>{styles}</style>

        <main className="subscription-page">

          <div className="container">

            <div className="brand">
              OZT DIGITAL
            </div>

            <h1 className="main-title">
              Aboneliğiniz
              <span> Aktif</span>
            </h1>

            <p className="subtitle">
              Dijital restoran sisteminiz
              kullanıma hazır.
            </p>

            <div className="active-card">

              <div className="active-badge">
                {subscription.status ===
                "trial"
                  ? "14 GÜN ÜCRETSİZ DENEME"
                  : "AKTİF ABONELİK"}
              </div>

              <h2>
                {
                  subscription
                    .subscription_plans
                    ?.name
                }
              </h2>

              <div className="active-row">
                Ödeme periyodu:
                <strong>
                  {subscription.billing_interval ===
                  "monthly"
                    ? " Aylık"
                    : " Yıllık"}
                </strong>
              </div>

              {endDate && (
                <div className="active-row">
                  Deneme / dönem bitişi:
                  <strong>
                    {new Date(
                      endDate
                    ).toLocaleDateString(
                      "tr-TR"
                    )}
                  </strong>
                </div>
              )}

              <div className="active-actions">
                <button
                  className="primary-action"
                  onClick={() => {
                    setChangingPlan(true);
                    setSubscription(null);
                    setMessage("");
                  }}
                >
                  PAKET DEĞİŞTİR
                </button>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setChangingPlan(false);
                    setSubscription(null);
                    setMessage("");
                  }}
                >
                  PAKETLERİ GÖR
                </button>

                <button
                  className="danger-button"
                  disabled={cancelling}
                  onClick={cancelSubscription}
                >
                  {cancelling
                    ? "İPTAL EDİLİYOR..."
                    : "ABONELİĞİ İPTAL ET"}
                </button>
              </div>

            </div>

          </div>

        </main>
      </>
    );
  }

  // -------------------------------------------------------
  // PLANLAR
  // -------------------------------------------------------

  return (
    <>
      <style>{styles}</style>

      <main className="subscription-page">

        <div className="container">

          {/* HEADER */}

          <div className="header">

            <div className="brand">
              OZT DIGITAL
            </div>

            <h1 className="main-title">
              Restoranınızı
              <span>
                {" "}dijitale taşıyın.
              </span>
            </h1>

            <p className="subtitle">
              QR Menü, NFC, masa sistemi,
              garson çağırma, sipariş ve
              daha fazlası tek platformda.
            </p>

          </div>

          {/* API ERROR */}

          {apiError && (
            <div className="error-box">
              <strong>
                Paketler yüklenemedi
              </strong>

              <div>
                {apiError}
              </div>
            </div>
          )}

          {/* INTERVAL */}

          <div className="interval-wrapper">

            <div className="interval-switch">

              <button
                className={
                  selectedInterval ===
                  "monthly"
                    ? "interval active"
                    : "interval"
                }
                onClick={() =>
                  setSelectedInterval(
                    "monthly"
                  )
                }
              >
                Aylık
              </button>

              <button
                className={
                  selectedInterval ===
                  "yearly"
                    ? "interval active"
                    : "interval"
                }
                onClick={() =>
                  setSelectedInterval(
                    "yearly"
                  )
                }
              >
                Yıllık
              </button>

            </div>

          </div>

          {/* PLANS */}

          <div className="plans">

            {plans.map((plan) => {

              const selected =
                selectedPlan ===
                plan.id;

              const price =
                selectedInterval ===
                "monthly"
                  ? Number(
                      plan.monthly_price
                    )
                  : Number(
                      plan.yearly_price
                    );

              return (
                <div
                  key={plan.id}
                  className={
                    selected
                      ? "plan selected"
                      : "plan"
                  }
                  onClick={() =>
                    setSelectedPlan(
                      plan.id
                    )
                  }
                >

                  {plan.slug ===
                    "profesyonel" && (
                    <div className="popular">
                      EN ÇOK TERCİH EDİLEN
                    </div>
                  )}

                  <h2>
                    {plan.name}
                  </h2>

                  <p className="description">
                    {plan.description}
                  </p>

                  <div className="price">
                    {price.toLocaleString(
                      "tr-TR"
                    )}

                    <small>
                      TL /{" "}
                      {selectedInterval ===
                      "monthly"
                        ? "ay"
                        : "yıl"}
                    </small>
                  </div>

                  <div className="trial">
                    {plan.trial_days}
                    {" "}gün ücretsiz deneme
                  </div>

                  <div className="line" />

                  <ul>
                    {(
                      plan.features ||
                      []
                    ).map(
                      (
                        feature,
                        index
                      ) => (
                        <li
                          key={index}
                        >
                          <span>✓</span>
                          {feature}
                        </li>
                      )
                    )}
                  </ul>

                  <div
                    className={
                      selected
                        ? "radio selected-radio"
                        : "radio"
                    }
                  >
                    {selected && "✓"}
                  </div>

                </div>
              );
            })}

          </div>

          {/* ACTION */}

          <div className="action">

            {message && (
              <div className="message">
                {message}
              </div>
            )}

            <button
              className="start-button"
              disabled={
                starting ||
                !selectedPlan
              }
              onClick={handleSubscriptionAction}
            >
              {starting
                ? changingPlan
                  ? "ÖDEME SAYFASI AÇILIYOR..."
                  : "DENEME BAŞLATILIYOR..."
                : changingPlan
                  ? "PAKETİ DEĞİŞTİR VE ÖDEMEYE GEÇ"
                  : "14 GÜN ÜCRETSİZ DENEYİ BAŞLAT"}
            </button>

            <p className="note">
              {changingPlan
                ? "Seçtiğiniz yeni paket için ödeme adımına geçeceksiniz."
                : "14 gün boyunca ücret alınmaz. Denemenizi hemen başlatabilirsiniz."}
            </p>

          </div>

          <div className="footer">
            MİRA KITCHEN DEMO · OZT DIGITAL
          </div>

        </div>

      </main>
    </>
  );
}


// =========================================================
// TASARIM
// =========================================================

const styles = `

* {
  box-sizing: border-box;
}

.subscription-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top,
      rgba(212,175,55,0.10),
      transparent 38%
    ),
    #080808;

  color: #ffffff;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  padding: 55px 20px 70px;
}

.container {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 38px;
}

.brand {
  color: #d4af37;
  letter-spacing: 0.35em;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 18px;
}

.main-title {
  margin: 0;
  font-size: clamp(38px, 5vw, 65px);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -2px;
}

.main-title span {
  color: #d4af37;
}

.subtitle {
  max-width: 680px;
  margin: 20px auto 0;
  color: rgba(255,255,255,0.52);
  font-size: 16px;
  line-height: 1.7;
}

.interval-wrapper {
  display: flex;
  justify-content: center;
  margin: 35px 0 55px;
}

.interval-switch {
  padding: 5px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  display: flex;
}

.interval {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.55);
  padding: 13px 28px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.interval.active {
  background: #d4af37;
  color: #080808;
}

.plans {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 22px;
  align-items: stretch;
}

.plan {
  position: relative;
  cursor: pointer;

  border: 1px solid
    rgba(255,255,255,0.10);

  background:
    linear-gradient(
      145deg,
      rgba(255,255,255,0.055),
      rgba(255,255,255,0.018)
    );

  border-radius: 26px;

  padding: 32px 27px;

  min-height: 540px;

  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.plan:hover {
  transform: translateY(-5px);
  border-color:
    rgba(212,175,55,0.35);
}

.plan.selected {
  border-color: #d4af37;

  background:
    linear-gradient(
      145deg,
      rgba(212,175,55,0.12),
      rgba(255,255,255,0.025)
    );

  box-shadow:
    0 0 45px
    rgba(212,175,55,0.08);
}

.plan h2 {
  margin: 0;
  font-size: 25px;
}

.description {
  min-height: 47px;
  margin: 10px 0 0;

  color:
    rgba(255,255,255,0.43);

  font-size: 13px;
  line-height: 1.55;
}

.price {
  margin-top: 25px;
  font-size: 43px;
  font-weight: 800;
  letter-spacing: -1px;
}

.price small {
  font-size: 13px;
  color:
    rgba(255,255,255,0.40);

  font-weight: 400;
  margin-left: 5px;
}

.trial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border: 1px solid rgba(212,175,55,0.28);
  border-radius: 999px;
  background: rgba(212,175,55,0.08);
  color: #d4af37;
  font-size: 12px;
  font-weight: 700;
  margin-top: 12px;
}

.line {
  height: 1px;
  background:
    rgba(255,255,255,0.09);

  margin: 25px 0;
}

.plan ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.plan li {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  color:
    rgba(255,255,255,0.68);

  font-size: 13px;
  line-height: 1.4;

  margin-bottom: 12px;
}

.plan li span {
  color: #d4af37;
  font-weight: 800;
}

.popular {
  position: absolute;

  left: 50%;
  top: -13px;

  transform:
    translateX(-50%);

  white-space: nowrap;

  padding: 7px 16px;

  border-radius: 999px;

  background: #d4af37;
  color: #080808;

  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.radio {
  position: absolute;

  right: 23px;
  top: 25px;

  width: 22px;
  height: 22px;

  border-radius: 50%;

  border: 1px solid
    rgba(255,255,255,0.25);

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 12px;
}

.selected-radio {
  background: #d4af37;
  color: #080808;
  border-color: #d4af37;
}

.action {
  max-width: 650px;
  margin: 42px auto 0;
  text-align: center;
}

.start-button {
  width: 100%;

  border: 0;

  background: #d4af37;
  color: #080808;

  padding: 19px 25px;

  border-radius: 16px;

  font-size: 15px;
  font-weight: 800;

  cursor: pointer;

  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.start-button:hover:not(:disabled) {
  background: #e4c45c;
  transform: translateY(-2px);
}

.start-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.note {
  color:
    rgba(255,255,255,0.30);

  font-size: 12px;

  margin-top: 13px;
}

.message {
  padding: 15px;
  margin-bottom: 15px;

  border:
    1px solid
    rgba(212,175,55,0.30);

  border-radius: 14px;

  background:
    rgba(212,175,55,0.08);

  color: #d4af37;

  font-size: 14px;
}

.error-box {
  max-width: 650px;
  margin: 0 auto 25px;

  padding: 18px;

  border:
    1px solid
    rgba(255,80,80,0.30);

  background:
    rgba(255,80,80,0.07);

  border-radius: 14px;

  color: #ff8c8c;

  text-align: center;

  font-size: 13px;
}

.error-box strong {
  display: block;
  margin-bottom: 5px;
}

.active-card {
  max-width: 550px;
  margin: 50px auto 0;

  padding: 42px;

  text-align: center;

  border:
    1px solid
    rgba(212,175,55,0.35);

  border-radius: 28px;

  background:
    rgba(255,255,255,0.035);
}

.active-badge {
  display: inline-block;

  background:
    rgba(212,175,55,0.12);

  color: #d4af37;

  border-radius: 999px;

  padding: 9px 15px;

  font-size: 11px;
  font-weight: 800;

  margin-bottom: 20px;
}

.active-card h2 {
  margin: 0 0 25px;
  font-size: 31px;
}

.active-row {
  color:
    rgba(255,255,255,0.48);

  font-size: 14px;

  margin-top: 13px;
}

.active-row strong {
  color: white;
}

.secondary-button {
  margin-top: 30px;

  padding: 13px 23px;

  border:
    1px solid
    rgba(212,175,55,0.4);

  background: transparent;

  color: #d4af37;

  border-radius: 12px;

  cursor: pointer;
}


.active-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 30px;
}

.active-actions button {
  width: 100%;
}

.primary-action {
  padding: 14px 23px;
  border: 0;
  background: #d4af37;
  color: #080808;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 800;
}

.primary-action:hover {
  background: #e4c45c;
}

.danger-button {
  padding: 13px 23px;
  border: 1px solid rgba(255, 90, 90, .35);
  background: rgba(255, 70, 70, .06);
  color: #ff9999;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
}

.danger-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.loading-box {
  min-height: 70vh;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;
}

.logo-small {
  color: #d4af37;
  letter-spacing: 0.3em;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 12px;
}

.loading-text {
  color:
    rgba(255,255,255,0.40);

  font-size: 14px;
}

.footer {
  margin-top: 60px;

  text-align: center;

  color:
    rgba(255,255,255,0.20);

  font-size: 10px;

  letter-spacing: 0.15em;
}

@media (max-width: 850px) {

  .plans {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin: 0 auto;
  }

  .plan {
    min-height: auto;
  }

  .main-title {
    font-size: 42px;
  }

}

@media (max-width: 480px) {

  .subscription-page {
    padding: 35px 14px 50px;
  }

  .main-title {
    font-size: 36px;
  }

  .subtitle {
    font-size: 14px;
  }

  .plan {
    padding: 27px 22px;
  }

  .price {
    font-size: 38px;
  }

}

`;