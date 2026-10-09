"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { linkLeadToRestaurant } from "../saha/actions";
import AdminIcon from "../../admin/AdminIcon";
import { RESTAURANT_THEMES, isAuroraTheme, normalizeRestaurantTheme } from "../../../lib/themes";
import { CredentialsBox } from "../SystemUi";
import { FEATURE_INFO, featuresAddedIn, type Plan } from "../../../lib/plan";

type RestaurantTheme = (typeof RESTAURANT_THEMES)[number]["value"];

// Paket seçimi. Başlangıç "sadece menü"dür: tek QR, masa ve sipariş yok,
// Aurora menüsünü kullanır. Özellik listesi lib/plan.ts'den gelir.
type RestaurantType = Plan;

const RESTAURANT_TYPES: {
  value: RestaurantType;
  title: string;
  description: string;
  features: string[];
}[] = [
  {
    value: "starter",
    title: "Başlangıç",
    description: "Dijital menü. Müşteri QR'ı okutup menüyü görür; sipariş yok.",
    features: featuresAddedIn("starter").map((feature) => FEATURE_INFO[feature].label),
  },
  {
    value: "pro",
    title: "Pro",
    description: "Masada sipariş: Başlangıç'taki her şeye ek olarak",
    features: featuresAddedIn("pro").map((feature) => FEATURE_INFO[feature].label),
  },
  {
    value: "premium",
    title: "Premium",
    description: "Tam sistem: Pro'daki her şeye ek olarak",
    features: featuresAddedIn("premium").map((feature) => FEATURE_INFO[feature].label),
  },
];

type Form = {
  restaurant_type: RestaurantType;
  name: string;
  slug: string;
  description: string;
  instagram_url: string;
  google_review_url: string;
  manager_email: string;
  manager_password: string;
  table_count: string;
  theme: RestaurantTheme;
};

type Created = {
  restaurantId: number;
  name: string;
  email: string;
  password: string;
};

function createSlug(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
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

const EMPTY_FORM: Form = {
  restaurant_type: "pro",
  name: "",
  slug: "",
  description: "",
  instagram_url: "",
  google_review_url: "",
  manager_email: "",
  manager_password: "",
  table_count: "20",
  theme: normalizeRestaurantTheme("aurora"),
};

// Saha satıştan "restorana dönüştür" ile gelindiyse form bilgilerle dolar.
function initialForm(params: URLSearchParams): Form {
  const name = params.get("ad")?.trim() ?? "";
  const plan = params.get("paket");
  const tables = Number(params.get("masa"));
  return {
    ...EMPTY_FORM,
    name,
    slug: name ? createSlug(name) : "",
    instagram_url: params.get("instagram")?.trim() ?? "",
    restaurant_type: plan === "starter" || plan === "pro" || plan === "premium" ? plan : EMPTY_FORM.restaurant_type,
    table_count: Number.isInteger(tables) && tables > 0 ? String(Math.min(tables, 500)) : EMPTY_FORM.table_count,
  };
}

export default function YeniRestoranPage() {
  const params = useSearchParams();
  const leadId = Number(params.get("aday"));
  const [form, setForm] = useState<Form>(() => initialForm(params));
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);

  const isMenuOnly = form.restaurant_type === "starter";
  const themeChoices = isMenuOnly
    ? RESTAURANT_THEMES.filter((theme) => isAuroraTheme(theme.value))
    : RESTAURANT_THEMES;

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Sadece menü restoranları Aurora menüsünü kullanır; seçili tema Aurora
  // değilse koyu Aurora'ya geçilir.
  function changeType(value: RestaurantType) {
    setForm((current) => ({
      ...current,
      restaurant_type: value,
      theme:
        value === "starter" && !isAuroraTheme(current.theme)
          ? normalizeRestaurantTheme("aurora")
          : current.theme,
    }));
  }

  function changeName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : createSlug(value),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const tableCount = Number(form.table_count);

    if (!form.name.trim()) return setError("Restoran adı zorunludur.");
    if (!form.slug.trim()) return setError("Restoran adresi (slug) zorunludur.");
    if (!form.manager_email.trim()) return setError("Yönetici e-postası zorunludur.");
    if (form.manager_password && form.manager_password.length < 8) {
      return setError("Şifre en az 8 karakter olmalı. Boş bırakırsanız otomatik oluşturulur.");
    }
    if (!isMenuOnly && (!Number.isInteger(tableCount) || tableCount < 1 || tableCount > 500)) {
      return setError("Masa sayısı 1 ile 500 arasında olmalıdır.");
    }

    setLoading(true);

    try {
      const response = await fetch("/api/sistem/restoran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          instagram_url: form.instagram_url.trim(),
          google_review_url: form.google_review_url.trim(),
          manager_email: form.manager_email.trim(),
          manager_password: form.manager_password,
          restaurant_type: isMenuOnly ? "menu" : "full",
          plan: form.restaurant_type,
          table_count: isMenuOnly ? 0 : tableCount,
          theme: normalizeRestaurantTheme(form.theme),
        }),
      });

      const data = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json()
        : {};

      if (!response.ok) {
        throw new Error(data.error || data.message || "Restoran oluşturulamadı.");
      }

      // Saha satıştaki işletme kazanıldı olarak bu restorana bağlanır.
      if (Number.isInteger(leadId) && leadId > 0) {
        await linkLeadToRestaurant(leadId, Number(data.restaurant_id)).catch(() => undefined);
      }

      setCreated({
        restaurantId: Number(data.restaurant_id),
        name: form.name.trim(),
        email: data.manager_email ?? form.manager_email.trim(),
        password: data.manager_password ?? form.manager_password,
      });
      window.scrollTo({ top: 0 });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Oluşturuldu ---------------- */

  if (created) {
    return (
      <main className="adm-page" style={{ maxWidth: 760 }}>
        <header className="adm-head">
          <div className="adm-head-text">
            <span className="adm-eyebrow">Restoran oluşturuldu</span>
            <h1>{created.name} hazır</h1>
            <p>
              Aşağıdaki giriş bilgilerini restoran yöneticisine iletin. Şifre bu sayfadan
              ayrıldıktan sonra tekrar gösterilmez.
            </p>
          </div>
        </header>

        <CredentialsBox email={created.email} password={created.password} />

        <div className="adm-head-actions">
          <Link className="adm-btn adm-btn-primary" href={`/sistem/restoran/${created.restaurantId}`}>
            <AdminIcon name="store" size={16} />
            Restoranı aç
          </Link>
          <button
            type="button"
            className="adm-btn"
            onClick={() => {
              setCreated(null);
              setForm(EMPTY_FORM);
              setSlugTouched(false);
            }}
          >
            <AdminIcon name="plus" size={16} />
            Yeni restoran daha
          </button>
          <Link className="adm-btn adm-btn-ghost" href="/sistem">
            Restoranlara dön
          </Link>
        </div>
      </main>
    );
  }

  /* ---------------- Form ---------------- */

  return (
    <main className="adm-page">
      <Link className="adm-back" href="/sistem">
        <AdminIcon name="arrowLeft" size={15} />
        Restoranlar
      </Link>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">İşletmeler</span>
          <h1>Yeni restoran</h1>
          <p>Restoranı, tasarımını ve işletme paneline girecek yönetici hesabını tek adımda oluşturun.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="adm-form" autoComplete="off" noValidate>
        {/* ---------- 1 · Tür ---------- */}
        <section className="adm-card" aria-labelledby="adim-tur">
          <div className="sys-step-head">
            <span className="sys-step">1</span>
            <div>
              <h2 id="adim-tur">Paket</h2>
              <p>Restoranın paketi. Başlangıç sadece menüdür; sipariş ve masa Pro ile başlar.</p>
            </div>
          </div>

          <div className="sys-type-grid" role="radiogroup" aria-label="Paket">
            {RESTAURANT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`sys-type-card ${form.restaurant_type === type.value ? "is-on" : ""}`}
              >
                <input
                  type="radio"
                  name="restaurant_type"
                  value={type.value}
                  checked={form.restaurant_type === type.value}
                  onChange={() => changeType(type.value)}
                />
                <span className="sys-type-card-head">
                  <span className="sys-radio" aria-hidden="true" />
                  <strong>{type.title}</strong>
                </span>
                <span className="sys-type-card-desc">{type.description}</span>
                <ul>
                  {type.features.map((feature) => (
                    <li key={feature}>
                      <AdminIcon name="check" size={14} strokeWidth={2.2} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
        </section>

        {/* ---------- 2 · Bilgiler ---------- */}
        <section className="adm-card" aria-labelledby="adim-bilgi">
          <div className="sys-step-head">
            <span className="sys-step">2</span>
            <div>
              <h2 id="adim-bilgi">Restoran bilgileri</h2>
              <p>Müşteriye gösterilen ad ve adres. Diğer bilgileri yönetici kendi panelinden tamamlar.</p>
            </div>
          </div>

          <div className="adm-form-grid">
            <div className="adm-field adm-field-full">
              <label className="adm-label" htmlFor="yeni-ad">Restoran adı</label>
              <input
                id="yeni-ad"
                className="adm-input"
                value={form.name}
                onChange={(event) => changeName(event.target.value)}
                placeholder="Örn. Mira Kitchen"
                required
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="yeni-slug">Adres (slug)</label>
              <div className="adm-input-group">
                <span className="sys-prefix">/restoran/</span>
                <input
                  id="yeni-slug"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update("slug", createSlug(event.target.value));
                  }}
                  placeholder="mira-kitchen"
                  required
                />
              </div>
              <span className="adm-hint">Addan otomatik oluşur; sonradan değiştirmek QR kodlarını bozar.</span>
            </div>

            {isMenuOnly ? (
              <div className="adm-field">
                <span className="adm-label">QR kod</span>
                <p className="sys-note">
                  Masa oluşturulmaz. Tek QR kod doğrudan menüye açılır:
                  <b>/restoran/{form.slug || "mira-kitchen"}/menu</b>
                </p>
              </div>
            ) : (
              <div className="adm-field">
                <label className="adm-label" htmlFor="yeni-masa">Masa sayısı</label>
                <input
                  id="yeni-masa"
                  className="adm-input"
                  type="number"
                  min={1}
                  max={500}
                  value={form.table_count}
                  onChange={(event) => update("table_count", event.target.value)}
                  required
                />
                <span className="adm-hint">Her masa için ayrı QR / NFC kodu oluşturulur.</span>
              </div>
            )}

            <div className="adm-field adm-field-full">
              <label className="adm-label" htmlFor="yeni-aciklama">
                Açıklama <em>· isteğe bağlı</em>
              </label>
              <textarea
                id="yeni-aciklama"
                className="adm-textarea"
                rows={3}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Restoran hakkında kısa açıklama"
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="yeni-instagram">
                Instagram <em>· isteğe bağlı</em>
              </label>
              <input
                id="yeni-instagram"
                className="adm-input"
                type="url"
                value={form.instagram_url}
                onChange={(event) => update("instagram_url", event.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="yeni-google">
                Google yorum bağlantısı <em>· isteğe bağlı</em>
              </label>
              <input
                id="yeni-google"
                className="adm-input"
                type="url"
                value={form.google_review_url}
                onChange={(event) => update("google_review_url", event.target.value)}
                placeholder="https://g.page/..."
              />
            </div>
          </div>
        </section>

        {/* ---------- 3 · Tema ---------- */}
        <section className="adm-card" aria-labelledby="adim-tema">
          <div className="sys-step-head">
            <span className="sys-step">3</span>
            <div>
              <h2 id="adim-tema">{isMenuOnly ? "Menü rengi" : "Tema"}</h2>
              <p>
                {isMenuOnly
                  ? "Sadece menü restoranları Aurora menüsünü kullanır; renk seçin."
                  : "Müşteri sayfalarının tasarımı. Sonradan sistem panelinden değiştirilebilir."}
              </p>
            </div>
          </div>

          <div className="sys-themes" role="radiogroup" aria-label="Tema">
            {themeChoices.map((theme) => (
              <button
                key={theme.value}
                type="button"
                role="radio"
                aria-checked={form.theme === theme.value}
                className={`sys-theme ${form.theme === theme.value ? "is-on" : ""}`}
                onClick={() => update("theme", theme.value)}
                title={theme.description}
              >
                <span
                  className="sys-theme-swatch"
                  style={{ background: theme.surface, color: theme.accent }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span className="sys-theme-name">{theme.label.replace(/^AURORA - /, "Aurora · ").replace(/^ZEST - /, "Zest · ").replace(/^LINEN - /, "Linen · ").replace(/^LUNA - /, "Luna · ")}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---------- 4 · Yönetici ---------- */}
        <section className="adm-card" aria-labelledby="adim-yonetici">
          <div className="sys-step-head">
            <span className="sys-step">4</span>
            <div>
              <h2 id="adim-yonetici">Restoran yöneticisi</h2>
              <p>İşletme paneline (/admin) bu hesapla girilir. Giriş bilgileri yalnızca sistem panelinde görünür.</p>
            </div>
          </div>

          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label" htmlFor="yeni-eposta">Yönetici e-postası</label>
              <input
                id="yeni-eposta"
                className="adm-input"
                type="email"
                value={form.manager_email}
                onChange={(event) => update("manager_email", event.target.value)}
                placeholder="yonetici@restoran.com"
                autoComplete="off"
                required
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="yeni-sifre">
                Şifre <em>· boşsa güçlü bir şifre oluşturulur</em>
              </label>
              <input
                id="yeni-sifre"
                className="adm-input"
                type="text"
                minLength={8}
                value={form.manager_password}
                onChange={(event) => update("manager_password", event.target.value)}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
            <AdminIcon name="alert" size={16} />
            {error}
          </p>
        )}

        <div className="adm-sticky-actions">
          <span>
            {form.restaurant_type === "starter" ? "Başlangıç" : form.restaurant_type === "pro" ? "Pro" : "Premium"} ·{" "}
            {RESTAURANT_THEMES.find((theme) => theme.value === form.theme)?.label.replace(/^AURORA - /, "Aurora · ").replace(/^ZEST - /, "Zest · ").replace(/^LINEN - /, "Linen · ").replace(/^LUNA - /, "Luna · ")}
          </span>
          <Link className="adm-btn" href="/sistem">Vazgeç</Link>
          <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg" disabled={loading}>
            <AdminIcon name="plus" size={17} />
            {loading ? "Oluşturuluyor…" : "Restoranı oluştur"}
          </button>
        </div>
      </form>
    </main>
  );
}
