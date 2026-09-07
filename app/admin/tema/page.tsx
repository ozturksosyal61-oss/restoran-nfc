"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createClient,
} from "../../../lib/supabase/client";
import {
  RESTAURANT_THEMES,
  type RestaurantTheme,
} from "../../../lib/themes";

export default function ThemeSettingsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [restaurant, setRestaurant] =
    useState<{
      id: number;
      name: string;
      slug: string;
      theme: RestaurantTheme;
    } | null>(null);
  const [selectedTheme, setSelectedTheme] =
    useState<RestaurantTheme>("classic");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError(
            "Oturum bulunamadı. Lütfen tekrar giriş yapın."
          );
          return;
        }

        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("restaurant_users")
          .select("restaurant_id")
          .eq("user_id", user.id)
          .single();

        if (
          membershipError ||
          !membership?.restaurant_id
        ) {
          setError(
            "Hesabınıza bağlı bir işletme bulunamadı."
          );
          return;
        }

        const {
          data,
          error: restaurantError,
        } = await supabase
          .from("restaurants")
          .select(
            "id,name,slug,theme"
          )
          .eq(
            "id",
            membership.restaurant_id
          )
          .single();

        if (
          restaurantError ||
          !data
        ) {
          setError(
            "İşletme bilgileri yüklenemedi."
          );
          return;
        }

        const rawTheme =
          data.theme;

        const normalizedTheme =
          RESTAURANT_THEMES.some(
            (theme) =>
              theme.value === rawTheme
          )
            ? (rawTheme as RestaurantTheme)
            : "classic";

        setRestaurant({
          id: Number(data.id),
          name: data.name,
          slug: data.slug,
          theme: normalizedTheme,
        });

        setSelectedTheme(
          normalizedTheme
        );
      } catch (loadError) {
        console.error(
          "Tema yükleme hatası:",
          loadError
        );

        setError(
          "Tema bilgileri yüklenirken bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  async function saveTheme() {
    if (!restaurant) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        error: updateError,
      } = await supabase
        .from("restaurants")
        .update({
          theme: selectedTheme,
        })
        .eq(
          "id",
          restaurant.id
        );

      if (updateError) {
        console.error(
          "Tema kaydetme hatası:",
          updateError
        );

        setError(
          "Tema kaydedilemedi: " +
            updateError.message
        );
        return;
      }

      setRestaurant(
        (current) =>
          current
            ? {
                ...current,
                theme: selectedTheme,
              }
            : current
      );

      setMessage(
        "Tema kaydedildi. Müşteri menüsünü yenilediğinizde uygulanacaktır."
      );
    } catch (saveError) {
      console.error(
        "Tema kaydetme hatası:",
        saveError
      );

      setError(
        "Tema kaydedilirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="nova-theme-admin">
        <style>{styles}</style>
        <div className="nova-admin-loading">
          <div className="nova-admin-spinner" />
          Tema seçenekleri yükleniyor...
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="nova-theme-admin">
        <style>{styles}</style>
        <div className="nova-admin-container">
          <div className="nova-admin-error">
            {error ||
              "İşletme bilgileri bulunamadı."}
          </div>
          <Link
            href="/admin"
            className="nova-admin-back"
          >
            ← Yönetim Paneline Dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="nova-theme-admin">
      <style>{styles}</style>

      <div className="nova-admin-container">
        <header className="nova-admin-header">
          <div>
            <span className="nova-admin-eyebrow">
              OZT DIGITAL MENU
            </span>
            <h1>
              Müşteri Deneyimi
            </h1>
            <p>
              {restaurant.name} için
              müşterilerin göreceği
              görsel temayı seçin.
            </p>
          </div>

          <Link
            href="/admin"
            className="nova-admin-back"
          >
            ← Panel
          </Link>
        </header>

        {error && (
          <div className="nova-admin-alert error">
            {error}
          </div>
        )}

        {message && (
          <div className="nova-admin-alert success">
            {message}
          </div>
        )}

        <section className="nova-theme-card">
          <div className="nova-theme-card-head">
            <div>
              <span className="nova-admin-eyebrow">
                TEMA SEÇİMİ
              </span>
              <h2>
                Bir görünüm seçin
              </h2>
            </div>

            <span className="nova-current-badge">
              Mevcut:{" "}
              {
                RESTAURANT_THEMES.find(
                  (theme) =>
                    theme.value ===
                    selectedTheme
                )?.label
              }
            </span>
          </div>

          <p className="nova-theme-description">
            Tema değişikliği ürünlerinizi,
            kategorilerinizi, masalarınızı veya
            sipariş altyapınızı değiştirmez.
            Yalnızca müşteri tarafındaki
            görünümü seçer.
          </p>

          <div className="nova-theme-grid">
            {RESTAURANT_THEMES.map(
              (theme) => {
                const selected =
                  selectedTheme ===
                  theme.value;

                return (
                  <button
                    key={theme.value}
                    type="button"
                    className={
                      selected
                        ? "nova-theme-option selected"
                        : "nova-theme-option"
                    }
                    onClick={() =>
                      setSelectedTheme(
                        theme.value
                      )
                    }
                  >
                    <div
                      className="nova-theme-preview"
                      style={{
                        background:
                          theme.surface,
                      }}
                    >
                      <div
                        className="nova-preview-top"
                        style={{
                          background:
                            theme.surface,
                          borderColor:
                            theme.accent,
                        }}
                      >
                        <span
                          style={{
                            background:
                              theme.accent,
                          }}
                        />
                        <span
                          style={{
                            background:
                              theme.accent,
                          }}
                        />
                        <span
                          style={{
                            background:
                              theme.accent,
                          }}
                        />
                      </div>

                      <div className="nova-preview-body">
                        <div
                          className="nova-preview-photo"
                          style={{
                            background:
                              `linear-gradient(135deg, ${theme.accent}, #1a1a1a)`,
                          }}
                        />
                        <div className="nova-preview-lines">
                          <span
                            style={{
                              background:
                                theme.accent,
                            }}
                          />
                          <span />
                          <span />
                        </div>
                      </div>

                      <div className="nova-preview-pill-row">
                        <span
                          style={{
                            borderColor:
                              theme.accent,
                          }}
                        />
                        <span
                          style={{
                            borderColor:
                              theme.accent,
                          }}
                        />
                        <span
                          style={{
                            background:
                              theme.accent,
                          }}
                        />
                      </div>
                    </div>

                    <div className="nova-theme-option-content">
                      <div>
                        <strong>
                          {theme.label}
                        </strong>
                        <small>
                          {
                            theme.description
                          }
                        </small>
                      </div>

                      <span
                        className="nova-select-mark"
                        style={
                          selected
                            ? {
                                background:
                                  theme.accent,
                                color:
                                  theme.value ===
                                  "dark-modern" ||
                                  theme.value ===
                                  "luxury-gold" ||
                                  theme.value ===
                                  "ozt-glass-premium"
                                    ? "#fff"
                                    : "#17130d",
                              }
                            : undefined
                        }
                      >
                        {selected
                          ? "✓"
                          : "Seç"}
                      </span>
                    </div>
                  </button>
                );
              }
            )}
          </div>

          <div className="nova-theme-highlight">
            <div>
              <span className="nova-admin-eyebrow">
                YENİ
              </span>
              <strong>
                OZT Nova Premium
              </strong>
              <p>
                Mobil uygulama hissi veren;
                arama, kategori keşfi,
                ürün kartları, sepet ve masa
                hizmetlerini tek bir akışta
                birleştiren yeni müşteri
                arayüzü.
              </p>
            </div>

            <div className="nova-theme-highlight-tag">
              Yeni nesil
            </div>
          </div>

          <div className="nova-save-row">
            <span>
              Seçtiğiniz tema, kaydetme
              işleminden sonra müşteri
              tarafında kullanılabilir.
            </span>

            <button
              type="button"
              className="nova-save-button"
              onClick={saveTheme}
              disabled={saving}
            >
              {saving
                ? "Kaydediliyor..."
                : "✓ Temayı Kaydet"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles = `
  .nova-theme-admin {
    min-height: 100vh;
    padding: 28px 16px 70px;
    background:
      radial-gradient(circle at 0% 0%, rgba(255,255,255,.95), transparent 26%),
      radial-gradient(circle at 100% 12%, rgba(211,181,124,.20), transparent 30%),
      #f4f0e8;
    color: #211d17;
  }

  .nova-theme-admin *,
  .nova-theme-admin *::before,
  .nova-theme-admin *::after {
    box-sizing: border-box;
  }

  .nova-admin-container {
    width: min(1080px,100%);
    margin: 0 auto;
  }

  .nova-admin-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
  }

  .nova-admin-eyebrow {
    display: block;
    color: #9a6f29;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 2px;
  }

  .nova-admin-header h1 {
    margin: 7px 0 0;
    font-family: Georgia,"Times New Roman",serif;
    font-size: clamp(30px,6vw,44px);
    font-weight: 600;
    letter-spacing: -.8px;
  }

  .nova-admin-header p {
    max-width: 700px;
    margin: 8px 0 0;
    color: #756e64;
    font-size: 12px;
    line-height: 1.55;
  }

  .nova-admin-back {
    flex: 0 0 auto;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    border: 1px solid #ddd2c0;
    border-radius: 12px;
    background: rgba(255,255,255,.72);
    color: #4c4338;
    text-decoration: none;
    font-size: 11px;
    font-weight: 850;
  }

  .nova-admin-alert {
    margin-bottom: 14px;
    padding: 13px 15px;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 750;
  }

  .nova-admin-alert.error {
    border: 1px solid #e3b9b9;
    background: #fff3f3;
    color: #a22525;
  }

  .nova-admin-alert.success {
    border: 1px solid #bdddc8;
    background: #effaf2;
    color: #277243;
  }

  .nova-theme-card {
    padding: 22px;
    border: 1px solid #e3dacb;
    border-radius: 26px;
    background: rgba(255,255,255,.82);
    box-shadow:
      0 20px 50px rgba(73,56,33,.07),
      inset 0 1px 0 rgba(255,255,255,.8);
    backdrop-filter: blur(12px);
  }

  .nova-theme-card-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 15px;
  }

  .nova-theme-card-head h2 {
    margin: 6px 0 0;
    font-family: Georgia,"Times New Roman",serif;
    font-size: 29px;
    font-weight: 600;
  }

  .nova-current-badge {
    padding: 8px 11px;
    border-radius: 999px;
    border: 1px solid #e0d5c3;
    background: #f7f2e9;
    color: #6d6256;
    font-size: 10px;
    font-weight: 850;
  }

  .nova-theme-description {
    max-width: 760px;
    margin: 9px 0 20px;
    color: #777066;
    font-size: 11px;
    line-height: 1.6;
  }

  .nova-theme-grid {
    display: grid;
    grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 13px;
  }

  .nova-theme-option {
    width: 100%;
    padding: 0;
    overflow: hidden;
    text-align: left;
    border: 1px solid #e1d8ca;
    border-radius: 20px;
    background: #fff;
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }

  .nova-theme-option:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(72,53,27,.08);
  }

  .nova-theme-option.selected {
    border: 2px solid #be8d42;
    box-shadow: 0 15px 32px rgba(174,128,54,.14);
  }

  .nova-theme-preview {
    height: 142px;
    padding: 12px;
    overflow: hidden;
  }

  .nova-preview-top {
    display: flex;
    gap: 5px;
    align-items: center;
    height: 29px;
    padding: 0 9px;
    border-radius: 11px;
    border: 1px solid;
  }

  .nova-preview-top span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .nova-preview-body {
    display: grid;
    grid-template-columns: 74px 1fr;
    gap: 10px;
    align-items: center;
    margin-top: 13px;
  }

  .nova-preview-photo {
    height: 64px;
    border-radius: 11px;
  }

  .nova-preview-lines {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .nova-preview-lines span {
    height: 7px;
    border-radius: 999px;
    background: rgba(120,110,95,.19);
  }

  .nova-preview-lines span:first-child {
    width: 62%;
  }

  .nova-preview-lines span:nth-child(2) {
    width: 88%;
  }

  .nova-preview-lines span:nth-child(3) {
    width: 73%;
  }

  .nova-preview-pill-row {
    display: flex;
    gap: 7px;
    margin-top: 12px;
  }

  .nova-preview-pill-row span {
    width: 54px;
    height: 17px;
    border: 1px solid;
    border-radius: 999px;
  }

  .nova-preview-pill-row span:last-child {
    border: 0;
  }

  .nova-theme-option-content {
    min-height: 75px;
    padding: 12px 13px 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid #eee7dc;
  }

  .nova-theme-option-content strong,
  .nova-theme-option-content small {
    display: block;
  }

  .nova-theme-option-content strong {
    color: #29231c;
    font-size: 14px;
    font-weight: 900;
  }

  .nova-theme-option-content small {
    max-width: 360px;
    margin-top: 4px;
    color: #847a6d;
    font-size: 9px;
    line-height: 1.45;
  }

  .nova-select-mark {
    flex: 0 0 auto;
    min-width: 49px;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #f1ede6;
    color: #645b51;
    font-size: 10px;
    font-weight: 950;
  }

  .nova-theme-highlight {
    margin-top: 15px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    border: 1px solid #e4d6bc;
    border-radius: 18px;
    background:
      linear-gradient(145deg,#fbf5e9,#f1e3c8);
  }

  .nova-theme-highlight strong {
    display: block;
    margin-top: 5px;
    font-family: Georgia,"Times New Roman",serif;
    font-size: 20px;
  }

  .nova-theme-highlight p {
    max-width: 730px;
    margin: 5px 0 0;
    color: #756a5c;
    font-size: 10px;
    line-height: 1.5;
  }

  .nova-theme-highlight-tag {
    flex: 0 0 auto;
    padding: 7px 9px;
    border-radius: 999px;
    background: #1b1a18;
    color: #f3d296;
    font-size: 9px;
    font-weight: 900;
  }

  .nova-save-row {
    margin-top: 17px;
    padding-top: 15px;
    border-top: 1px dashed #dfd4c3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .nova-save-row > span {
    color: #867c70;
    font-size: 10px;
    line-height: 1.45;
  }

  .nova-save-button {
    min-height: 48px;
    padding: 0 18px;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg,#d6ad60,#ae761f);
    color: #19140c;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 9px 22px rgba(164,115,33,.18);
  }

  .nova-save-button:disabled {
    opacity: .62;
    cursor: not-allowed;
  }

  .nova-admin-loading {
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    color: #756e64;
    font-size: 12px;
    font-weight: 800;
  }

  .nova-admin-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid rgba(170,124,45,.18);
    border-top-color: #af7d2e;
    border-radius: 50%;
    animation: nova-admin-spin .8s linear infinite;
  }

  @keyframes nova-admin-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 700px) {
    .nova-theme-grid {
      grid-template-columns: 1fr;
    }

    .nova-admin-header,
    .nova-theme-card-head,
    .nova-theme-highlight,
    .nova-save-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .nova-admin-back {
      width: 100%;
    }

    .nova-save-button {
      width: 100%;
    }

    .nova-theme-highlight-tag {
      align-self: flex-start;
    }
  }
`;
