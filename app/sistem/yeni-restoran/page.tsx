"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RESTAURANT_THEMES, normalizeRestaurantTheme } from "../../../lib/themes";

export default function YeniRestoranPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    instagram_url: "",
    google_review_url: "",
    manager_email: "",
    manager_password: "",
    table_count: "20",
    theme: "classic",
  });

  function updateField(name: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

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

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: createSlug(value),
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const restaurantName = form.name.trim();
    const restaurantSlug = form.slug.trim();
    const managerEmail = form.manager_email.trim();
    const tableCount = Number(form.table_count);

    if (!restaurantName) {
      setError("Restoran adı zorunludur.");
      return;
    }

    if (!restaurantSlug) {
      setError("Restoran slug alanı zorunludur.");
      return;
    }

    if (!managerEmail) {
      setError("Yönetici e-posta adresi zorunludur.");
      return;
    }

    if (form.manager_password.length < 8) {
      setError("Yönetici şifresi en az 8 karakter olmalıdır.");
      return;
    }

    if (
      !Number.isInteger(tableCount) ||
      tableCount < 1 ||
      tableCount > 500
    ) {
      setError("Masa sayısı 1 ile 500 arasında olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/sistem/restoran", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: restaurantName,
          slug: restaurantSlug,
          description: form.description.trim(),
          instagram_url: form.instagram_url.trim(),
          google_review_url: form.google_review_url.trim(),
          manager_email: managerEmail,
          manager_password: form.manager_password,
          table_count: tableCount,
          theme: normalizeRestaurantTheme(form.theme),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Restoran oluşturulamadı.");
      }

      setSuccess("Restoran başarıyla oluşturuldu.");

      setTimeout(() => {
        router.push("/sistem");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="new-restaurant-page">
        <div className="new-restaurant-container">

          {/* HEADER */}
          <header className="new-restaurant-header">
            <div>
              <div className="new-restaurant-brand">
                OZT DIGITAL MENU
              </div>

              <h1>Yeni Restoran Ekle</h1>

              <p>
                Sisteme yeni bir restoran veya kafe ekleyin.
              </p>
            </div>

            <button
              type="button"
              className="new-restaurant-back"
              onClick={() => router.push("/sistem")}
            >
              ← Geri Dön
            </button>
          </header>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="new-restaurant-form"
            autoComplete="off"
          >

            {/* RESTORAN BİLGİLERİ */}
            <section className="new-restaurant-card">

              <div className="new-restaurant-section-header">
                <div className="section-number">
                  01
                </div>

                <div>
                  <h2>Restoran Bilgileri</h2>

                  <p>
                    Restoranın müşterilere gösterilecek temel bilgileri.
                  </p>
                </div>
              </div>

              <div className="new-restaurant-grid">

                {/* RESTORAN ADI */}
                <label className="full-width">
                  <span>Restoran Adı *</span>

                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      handleNameChange(e.target.value)
                    }
                    placeholder="Örn. OZT KAFE"
                  />
                </label>

                {/* SLUG */}
                <label>
                  <span>Slug *</span>

                  <input
                    required
                    value={form.slug}
                    onChange={(e) =>
                      updateField(
                        "slug",
                        createSlug(e.target.value)
                      )
                    }
                    placeholder="ozt-kafe"
                  />

                  <small>
                    Restoran adresi:
                    <strong>
                      /restoran/{form.slug || "ozt-kafe"}
                    </strong>
                  </small>
                </label>

                {/* MASA SAYISI */}
                <label>
                  <span>Masa Sayısı *</span>

                  <input
                    required
                    min="1"
                    max="500"
                    type="number"
                    value={form.table_count}
                    onChange={(e) =>
                      updateField(
                        "table_count",
                        e.target.value
                      )
                    }
                    placeholder="20"
                  />

                  <small>
                    Her masa için otomatik QR/NFC tokenı oluşturulur.
                  </small>
                </label>

                {/* AÇIKLAMA */}
                <label className="full-width">
                  <span>Açıklama</span>

                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      updateField(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Restoran hakkında kısa açıklama..."
                  />
                </label>

                {/* INSTAGRAM */}
                <label>
                  <span>Instagram</span>

                  <input
                    type="url"
                    value={form.instagram_url}
                    onChange={(e) =>
                      updateField(
                        "instagram_url",
                        e.target.value
                      )
                    }
                    placeholder="https://instagram.com/..."
                  />
                </label>

                {/* GOOGLE */}
                <label>
                  <span>Google Yorum Linki</span>

                  <input
                    type="url"
                    value={form.google_review_url}
                    onChange={(e) =>
                      updateField(
                        "google_review_url",
                        e.target.value
                      )
                    }
                    placeholder="https://g.page/..."
                  />
                </label>

              </div>
            </section>

            {/* TEMA */}
            <section className="new-restaurant-card">

              <div className="new-restaurant-section-header">
                <div className="section-number">
                  02
                </div>

                <div>
                  <h2>Premium Tema</h2>

                  <p>
                    Restoranın müşterilere göstereceği tasarımı seçin.
                  </p>
                </div>
              </div>

              <div className="theme-picker-grid">
                {RESTAURANT_THEMES.map((theme) => (
                  <label
                    key={theme.value}
                    className={`theme-option theme-option-${theme.value}`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={theme.value}
                      checked={form.theme === theme.value}
                      onChange={(e) => updateField("theme", e.target.value)}
                    />

                    <div className="theme-option-preview">
                      <div className="theme-preview-top">
                        <span className="theme-preview-dot" />
                        <span>{theme.label}</span>
                      </div>
                      <div className="theme-preview-title">
                        {theme.value === "classic"
                          ? "Sade & Zarif"
                          : theme.value === "dark-modern"
                            ? "Modern & Teknolojik"
                            : "Lüks & Prestij"}
                      </div>
                      <div className="theme-preview-actions">
                        <span>Menü</span>
                        <span>Sipariş</span>
                        <span>⭐</span>
                      </div>
                    </div>

                    <div className="theme-option-copy">
                      <strong>{theme.label}</strong>
                      <span>{theme.description}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="new-restaurant-info">
                <div className="info-icon">i</div>
                <div>
                  <strong>Gelecekte değiştirebilirsiniz.</strong>
                  <p>
                    Restoran oluşturulduktan sonra Sistem Sahibi Paneli&apos;nden tema değiştirilebilir.
                  </p>
                </div>
              </div>

            </section>

            {/* YÖNETİCİ */}
            <section className="new-restaurant-card">

              <div className="new-restaurant-section-header">
                <div className="section-number">
                  03
                </div>

                <div>
                  <h2>Restoran Yöneticisi</h2>

                  <p>
                    Restoranın yönetim paneline giriş yapacak hesabı oluşturun.
                  </p>
                </div>
              </div>

              <div className="new-restaurant-grid">

                {/* EMAIL */}
                <label>
                  <span>Yönetici E-posta *</span>

                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.manager_email}
                    onChange={(e) =>
                      updateField(
                        "manager_email",
                        e.target.value
                      )
                    }
                    placeholder="yonetici@restoran.com"
                  />
                </label>

                {/* PASSWORD */}
                <label>
                  <span>Geçici Şifre *</span>

                  <input
                    required
                    minLength={8}
                    autoComplete="new-password"
                    type="password"
                    value={form.manager_password}
                    onChange={(e) =>
                      updateField(
                        "manager_password",
                        e.target.value
                      )
                    }
                    placeholder="En az 8 karakter"
                  />
                </label>

              </div>

              <div className="new-restaurant-info">
                <div className="info-icon">
                  i
                </div>

                <div>
                  <strong>Bilgi</strong>

                  <p>
                    Bu hesap oluşturulduktan sonra restoran yöneticisi
                    <strong> /admin </strong>
                    üzerinden giriş yapabilir.
                  </p>
                </div>
              </div>

            </section>

            {/* HATA */}
            {error && (
              <div className="new-restaurant-message error">
                <strong>Hata</strong>
                <span>{error}</span>
              </div>
            )}

            {/* BAŞARI */}
            {success && (
              <div className="new-restaurant-message success">
                <strong>✓ Başarılı</strong>
                <span>{success}</span>
              </div>
            )}

            {/* BUTON */}
            <div className="new-restaurant-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() => router.push("/sistem")}
                disabled={loading}
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading
                  ? "Restoran Oluşturuluyor..."
                  : "＋ Restoranı Oluştur"}
              </button>

            </div>

          </form>
        </div>
      </main>

      {/* SAYFAYA ÖZEL CSS */}
      <style jsx>{`
        .new-restaurant-page {
          min-height: 100vh;
          background: #f3f1ed;
          padding: 40px 20px 70px;
          color: #111;
        }

        .new-restaurant-container {
          width: min(1000px, 100%);
          margin: 0 auto;
        }

        .new-restaurant-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 30px;
        }

        .new-restaurant-brand {
          margin-bottom: 10px;
          color: #b8860b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2.5px;
        }

        .new-restaurant-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.8px;
        }

        .new-restaurant-header p {
          margin: 8px 0 0;
          color: #77736d;
          font-size: 14px;
        }

        .new-restaurant-back {
          height: 46px;
          padding: 0 20px;
          border: 1px solid #ddd8cf;
          border-radius: 12px;
          background: #fff;
          color: #222;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: .2s ease;
        }

        .new-restaurant-back:hover {
          border-color: #b88920;
          transform: translateY(-1px);
        }

        .new-restaurant-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .new-restaurant-card {
          padding: 32px;
          border: 1px solid #e5dfd3;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 35px rgba(50, 40, 20, .07);
        }

        .new-restaurant-section-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 28px;
        }

        .section-number {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: #fff8e8;
          border: 1px solid #f0d89b;
          color: #a67c18;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .new-restaurant-section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
        }

        .new-restaurant-section-header p {
          margin: 5px 0 0;
          color: #85817b;
          font-size: 12px;
        }

        .new-restaurant-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .new-restaurant-grid label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .new-restaurant-grid label.full-width {
          grid-column: 1 / -1;
        }

        .new-restaurant-grid label > span {
          color: #292621;
          font-size: 12px;
          font-weight: 800;
        }

        .new-restaurant-grid input,
        .new-restaurant-grid textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 15px;
          border: 1px solid #ddd6c9;
          border-radius: 12px;
          outline: none;
          background: #faf9f6;
          color: #222;
          font-family: inherit;
          font-size: 14px;
          transition: .2s ease;
        }

        .new-restaurant-grid input {
          height: 50px;
        }

        .new-restaurant-grid textarea {
          min-height: 115px;
          resize: vertical;
          line-height: 1.5;
        }

        .new-restaurant-grid input:focus,
        .new-restaurant-grid textarea:focus {
          border-color: #c49a43;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(196, 154, 67, .12);
        }

        .new-restaurant-grid input::placeholder,
        .new-restaurant-grid textarea::placeholder {
          color: #aaa59c;
        }

        .new-restaurant-grid small {
          color: #8a857b;
          font-size: 11px;
          line-height: 1.4;
        }

        .new-restaurant-grid small strong {
          display: block;
          margin-top: 3px;
          color: #a67c18;
          font-weight: 800;
        }

        .theme-picker-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .theme-option {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
        }

        .theme-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .theme-option-preview {
          min-height: 150px;
          padding: 13px;
          border-radius: 17px;
          border: 1px solid #ded8ce;
          overflow: hidden;
          transition: .2s ease;
          box-shadow: 0 8px 20px rgba(0,0,0,.05);
        }

        .theme-preview-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .theme-preview-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #b8943d;
        }

        .theme-preview-title {
          margin-top: 26px;
          font-size: 15px;
          font-weight: 950;
        }

        .theme-preview-actions {
          display: flex;
          gap: 5px;
          margin-top: 22px;
        }

        .theme-preview-actions span {
          padding: 6px 7px;
          border-radius: 8px;
          font-size: 7px;
          font-weight: 900;
        }

        .theme-option-classic .theme-option-preview {
          background: linear-gradient(135deg,#faf9f6,#fff);
          color: #1a1a1a;
        }

        .theme-option-classic .theme-preview-actions span {
          background: #eee9df;
          color: #6d5b38;
        }

        .theme-option-dark-modern .theme-option-preview {
          background: linear-gradient(145deg,#071018,#0c1924);
          border-color: #16415a;
          color: #fff;
        }

        .theme-option-dark-modern .theme-preview-dot {
          background: #29a9ff;
        }

        .theme-option-dark-modern .theme-preview-actions span {
          background: #102735;
          color: #63c5ff;
        }

        .theme-option-luxury-gold .theme-option-preview {
          background: radial-gradient(circle at top right,#211809,#090806 45%,#050403);
          border-color: #8c6b20;
          color: #f8e2a1;
        }

        .theme-option-luxury-gold .theme-preview-dot {
          background: #d5a72c;
        }

        .theme-option-luxury-gold .theme-preview-actions span {
          background: #15110a;
          color: #e3bd50;
          border: 1px solid #4f3c18;
        }

        .theme-option input:checked + .theme-option-preview {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(0,0,0,.12);
          border-width: 2px;
        }

        .theme-option-classic input:checked + .theme-option-preview {
          border-color: #b8943d;
        }

        .theme-option-dark-modern input:checked + .theme-option-preview {
          border-color: #29a9ff;
        }

        .theme-option-luxury-gold input:checked + .theme-option-preview {
          border-color: #d5a72c;
        }

        .theme-option-copy {
          display: grid;
          gap: 3px;
        }

        .theme-option-copy strong {
          font-size: 13px;
          font-weight: 900;
        }

        .theme-option-copy span {
          color: #85817b;
          font-size: 10px;
          line-height: 1.45;
        }

        .new-restaurant-info {
          display: flex;
          gap: 13px;
          align-items: flex-start;
          margin-top: 22px;
          padding: 15px 17px;
          border: 1px solid #eee5d2;
          border-radius: 13px;
          background: #faf8f2;
        }

        .info-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: #b88920;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .new-restaurant-info strong {
          color: #292621;
          font-size: 12px;
        }

        .new-restaurant-info p {
          margin: 4px 0 0;
          color: #77736d;
          font-size: 12px;
          line-height: 1.5;
        }

        .new-restaurant-info p strong {
          color: #a67c18;
        }

        .new-restaurant-message {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 13px;
        }

        .new-restaurant-message.error {
          border: 1px solid #f0caca;
          background: #fff4f4;
          color: #b42318;
        }

        .new-restaurant-message.success {
          border: 1px solid #c9e8d3;
          background: #f1fff5;
          color: #187a3d;
        }

        .new-restaurant-message strong {
          font-weight: 900;
        }

        .new-restaurant-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .secondary-button,
        .primary-button {
          height: 52px;
          padding: 0 24px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .secondary-button {
          border: 1px solid #ddd8cf;
          background: #fff;
          color: #333;
        }

        .secondary-button:hover:not(:disabled) {
          background: #f7f5f1;
        }

        .primary-button {
          min-width: 230px;
          border: none;
          background: linear-gradient(135deg, #d5a746, #b98018);
          color: #fff;
          box-shadow: 0 7px 18px rgba(171, 120, 23, .18);
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(171, 120, 23, .25);
          filter: brightness(1.03);
        }

        .secondary-button:disabled,
        .primary-button:disabled {
          opacity: .6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 700px) {
          .new-restaurant-page {
            padding: 25px 14px 50px;
          }

          .new-restaurant-header {
            align-items: stretch;
            flex-direction: column;
          }

          .new-restaurant-header h1 {
            font-size: 27px;
          }

          .new-restaurant-back {
            width: 100%;
          }

          .new-restaurant-card {
            padding: 22px;
            border-radius: 18px;
          }

          .new-restaurant-grid {
            grid-template-columns: 1fr;
          }

          .new-restaurant-grid label.full-width {
            grid-column: auto;
          }

          .new-restaurant-actions {
            flex-direction: column-reverse;
          }

          .secondary-button,
          .primary-button {
            width: 100%;
          }
        }
        @media (max-width: 780px) {
          .theme-picker-grid {
            grid-template-columns: 1fr;
          }
        }

      `}</style>
    </>
  );
}