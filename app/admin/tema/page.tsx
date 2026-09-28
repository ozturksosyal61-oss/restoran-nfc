"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createClient,
} from "../../../lib/supabase/client";
import {
  RESTAURANT_THEMES,
  normalizeRestaurantTheme,
  type RestaurantTheme,
} from "../../../lib/themes";
import AdminIcon from "../AdminIcon";

// Tema, restorana özel olarak yalnızca sistem panelinden belirlenir.
// Bu sayfa restoran yöneticisine mevcut temayı gösterir; değiştirmez.
// (Veritabanında da restaurants.theme yalnızca sistem yöneticisi tarafından
// güncellenebilir: 20260929_aurora_color_themes.sql.)

export default function ThemeSettingsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [restaurant, setRestaurant] =
    useState<{
      id: number;
      name: string;
      slug: string;
      theme: RestaurantTheme;
    } | null>(null);

  useEffect(() => {
    async function load() {
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

        setRestaurant({
          id: Number(data.id),
          name: data.name,
          slug: data.slug,
          theme: normalizeRestaurantTheme(data.theme),
        });
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

  if (loading) {
    return (
      <main className="adm-page">
        <p className="adm-hint">Tema bilgisi yükleniyor…</p>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="adm-page">
        <div className="adm-empty">
          <strong>{error || "İşletme bilgileri bulunamadı."}</strong>
          <Link className="adm-btn" href="/admin">Panele dön</Link>
        </div>
      </main>
    );
  }

  const current =
    RESTAURANT_THEMES.find((theme) => theme.value === restaurant.theme) ?? RESTAURANT_THEMES[0];

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Ayarlar</span>
          <h1>Tema</h1>
          <p>
            Tema ve renkler işletmenize özel olarak OZT Digital tarafından ayarlanır.
            Farklı bir tema isterseniz destek ekibimize aşağıdakilerden birini belirtmeniz yeterli.
          </p>
        </div>
        <div className="adm-head-actions">
          <a
            className="adm-btn"
            href={`/restoran/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <AdminIcon name="external" size={16} />
            Müşteri sayfasını aç
          </a>
        </div>
      </header>

      <section className="adm-card adm-theme-current" aria-label="Kullanılan tema">
        <span className="adm-theme-swatch" style={{ background: current.surface, color: current.accent }}>
          <i />
          <i />
          <i />
        </span>
        <span className="adm-row-main">
          <small>Kullanılan tema</small>
          <strong style={{ fontSize: 18 }}>{current.label}</strong>
          <small>{current.description}</small>
        </span>
        <span className="adm-badge s-ok is-dot">Yayında</span>
      </section>

      <section className="adm-section" aria-labelledby="tema-katalog">
        <div className="adm-section-head">
          <h2 id="tema-katalog">Tüm temalar</h2>
        </div>
        <div className="adm-grid-3">
          {RESTAURANT_THEMES.map((theme) => {
            const selected = restaurant.theme === theme.value;
            return (
              <article key={theme.value} className={`adm-card adm-theme ${selected ? "is-active" : ""}`}>
                <span className="adm-theme-swatch is-wide" style={{ background: theme.surface, color: theme.accent }}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="adm-row-main">
                  <strong style={{ whiteSpace: "normal" }}>{theme.label}</strong>
                  <small>{theme.description}</small>
                </span>
                {selected && <span className="adm-badge s-ok is-dot">Kullanılıyor</span>}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
