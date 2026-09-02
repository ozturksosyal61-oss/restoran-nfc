"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type RegistrationResponse = {
  success?: boolean;
  restaurant_id?: number;
  error?: string;
};

function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function KayitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [restaurantName, setRestaurantName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [tableCount, setTableCount] = useState("20");

  const [planId, setPlanId] = useState("");
  const [billingInterval, setBillingInterval] = useState<
    "monthly" | "yearly"
  >("monthly");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const plan = searchParams.get("plan_id") || "";
    const interval =
      searchParams.get("billing_interval") === "yearly"
        ? "yearly"
        : "monthly";

    setPlanId(plan);
    setBillingInterval(interval);
  }, [searchParams]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const name = restaurantName.trim();
    const manager = managerName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const tables = Number(tableCount);

    if (!name) {
      setError("Restoran adı zorunludur.");
      return;
    }

    if (!manager) {
      setError("Yetkili adı zorunludur.");
      return;
    }

    if (!cleanEmail) {
      setError("E-posta adresi zorunludur.");
      return;
    }

    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (password !== passwordAgain) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    if (
      !Number.isInteger(tables) ||
      tables < 1 ||
      tables > 500
    ) {
      setError("Masa sayısı 1 ile 500 arasında olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/kayit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_name: name,
          manager_name: manager,
          email: cleanEmail,
          phone: cleanPhone,
          password,
          table_count: tables,
          plan_id: planId || null,
          billing_interval: billingInterval,
        }),
      });

      const data: RegistrationResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Kayıt sırasında bir hata oluştu."
        );
      }

      if (!data.restaurant_id) {
        throw new Error(
          "Restoran oluşturuldu ancak restoran ID alınamadı."
        );
      }

      // Kayıt tamamlandıktan sonra seçilen paket için
      // 14 günlük ücretsiz denemeyi otomatik başlat.
      const trialResponse = await fetch(
        "/api/subscription/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: data.restaurant_id,
            plan_id: planId,
            billing_interval: billingInterval,
          }),
        }
      );

      const trialData =
        await trialResponse.json();

      if (!trialResponse.ok || !trialData.success) {
        throw new Error(
          trialData.error ||
            "Hesabınız oluşturuldu ancak 14 günlük ücretsiz deneme başlatılamadı."
        );
      }

      // Müşteriyi kayıt sonrası otomatik olarak giriş yaptır.
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        throw new Error(
          "Hesabınız oluşturuldu ve denemeniz başlatıldı. Otomatik giriş yapılamadı; İşletme Girişi üzerinden giriş yapabilirsiniz."
        );
      }

      // Deneme aktif: müşteriyi direkt işletme paneline gönder.
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kayıt sırasında beklenmeyen bir hata oluştu."
      );
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <section className="register-shell">
        <div className="brand">OZT DIGITAL</div>

        <div className="eyebrow">
          14 GÜN ÜCRETSİZ DENE
        </div>

        <h1>Restoranınızı kaydedin.</h1>

        <p className="subtitle">
          Hesabınızı oluşturun. Seçtiğiniz paket için
          14 günlük ücretsiz denemeniz otomatik başlatılır
          ve ardından doğrudan işletme paneline girersiniz.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="section-title">
            RESTORAN BİLGİLERİ
          </div>

          <label>
            <span>Restoran Adı</span>
            <input
              value={restaurantName}
              onChange={(e) =>
                setRestaurantName(e.target.value)
              }
              placeholder="Örn. Mira Kitchen"
              autoComplete="organization"
              required
            />
          </label>

          <label>
            <span>Yetkili Adı Soyadı</span>
            <input
              value={managerName}
              onChange={(e) =>
                setManagerName(e.target.value)
              }
              placeholder="Ad Soyad"
              autoComplete="name"
              required
            />
          </label>

          <div className="grid">
            <label>
              <span>E-posta</span>
              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="ornek@restoran.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>Telefon</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="05xx xxx xx xx"
                autoComplete="tel"
              />
            </label>
          </div>

          <div className="grid">
            <label>
              <span>Şifre</span>
              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="En az 8 karakter"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label>
              <span>Şifre Tekrar</span>
              <input
                type="password"
                value={passwordAgain}
                onChange={(e) =>
                  setPasswordAgain(e.target.value)
                }
                placeholder="Şifrenizi tekrar girin"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </div>

          <label>
            <span>Masa Sayısı</span>
            <input
              type="number"
              min={1}
              max={500}
              value={tableCount}
              onChange={(e) =>
                setTableCount(e.target.value)
              }
              required
            />
          </label>

          {error && (
            <div className="error-box">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "HESABINIZ OLUŞTURULUYOR..."
              : "KAYDOL VE DENEMEYE GEÇ →"}
          </button>

          <p className="fine-print">
            Kayıt ücretsizdir. Deneme süresinde ücret alınmaz.
          </p>
        </form>

        <button
          type="button"
          className="back-button"
          onClick={() =>
            router.push(
              `/abonelik${
                planId
                  ? `?plan_id=${encodeURIComponent(
                      planId
                    )}&billing_interval=${encodeURIComponent(
                      billingInterval
                    )}`
                  : ""
              }`
            )
          }
        >
          ← Paketlere Dön
        </button>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .register-page {
          min-height: 100vh;
          padding: 45px 18px 70px;
          background:
            radial-gradient(
              circle at top,
              rgba(212, 175, 55, 0.1),
              transparent 36%
            ),
            #080808;
          color: #fff;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .register-shell {
          width: min(720px, 100%);
          margin: 0 auto;
          padding: 42px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.06),
              rgba(255, 255, 255, 0.018)
            );
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.35);
        }

        .brand {
          color: #d4af37;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.35em;
          text-align: center;
        }

        .eyebrow {
          margin-top: 30px;
          color: #d4af37;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-align: center;
        }

        h1 {
          margin: 10px 0 0;
          text-align: center;
          font-size: clamp(34px, 6vw, 54px);
          line-height: 1.03;
          letter-spacing: -2px;
        }

        .subtitle {
          max-width: 580px;
          margin: 17px auto 34px;
          color: rgba(255, 255, 255, 0.55);
          text-align: center;
          line-height: 1.7;
          font-size: 14px;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-title {
          margin-top: 4px;
          color: #aaa;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label span {
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          font-weight: 800;
        }

        input {
          width: 100%;
          min-height: 48px;
          padding: 13px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.045);
          color: #fff;
          font-size: 14px;
          outline: none;
        }

        input:focus {
          border-color: rgba(212, 175, 55, 0.7);
          box-shadow:
            0 0 0 3px rgba(212, 175, 55, 0.08);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .error-box {
          padding: 13px 14px;
          border: 1px solid rgba(255, 90, 90, 0.26);
          border-radius: 13px;
          background: rgba(255, 90, 90, 0.07);
          color: #ffb5b5;
          font-size: 12px;
          line-height: 1.5;
        }

        form button {
          min-height: 54px;
          margin-top: 5px;
          border: 0;
          border-radius: 15px;
          background: #d4af37;
          color: #080808;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 12px 30px rgba(212, 175, 55, 0.15);
        }

        form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .fine-print {
          margin: 0;
          color: rgba(255, 255, 255, 0.38);
          text-align: center;
          font-size: 11px;
          line-height: 1.5;
        }

        .back-button {
          width: 100%;
          min-height: 46px;
          margin-top: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: transparent;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .register-shell {
            padding: 28px 18px;
            border-radius: 22px;
          }

          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
