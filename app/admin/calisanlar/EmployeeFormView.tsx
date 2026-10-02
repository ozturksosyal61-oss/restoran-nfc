"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import AdminIcon from "../AdminIcon";

// Yeni çalışan ve çalışan düzenleme sayfalarının ortak form görünümü.

const ROLES = [
  { value: "garson", label: "Garson", hint: "Servis ve masalar" },
  { value: "mutfak", label: "Mutfak", hint: "Hazırlık ve pişirme" },
  { value: "yonetici", label: "Yönetici", hint: "Salon ve ekip" },
];

export default function EmployeeFormView({
  mode,
  name,
  onName,
  phone,
  onPhone,
  role,
  onRole,
  isActive,
  onActive,
  error,
  success,
  loading,
  onSubmit,
  onDelete,
  deleting,
  extra,
}: {
  mode: "new" | "edit";
  name: string;
  onName: (value: string) => void;
  phone: string;
  onPhone: (value: string) => void;
  role: string;
  onRole: (value: string) => void;
  isActive: boolean;
  onActive: (value: boolean) => void;
  error: string;
  success?: string;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
  deleting?: boolean;
  // Formun altında gösterilecek ek bölüm (ör. garson / mutfak girişi).
  extra?: ReactNode;
}) {
  return (
    <main className="adm-page" style={{ maxWidth: 720 }}>
      <Link className="adm-back" href="/admin/calisanlar">
        <AdminIcon name="arrowLeft" size={15} />
        Çalışanlar
      </Link>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">İşletme</span>
          <h1>{mode === "new" ? "Yeni çalışan" : "Çalışanı düzenle"}</h1>
          <p>Aktif çalışanlar müşterinin değerlendirme ekranında listelenir.</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="adm-card adm-form">
        <div className="adm-form-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="calisan-ad">Ad soyad</label>
            <input
              id="calisan-ad"
              className="adm-input"
              type="text"
              value={name}
              onChange={(event) => onName(event.target.value)}
              placeholder="Örn. Ayşe Yılmaz"
              autoComplete="name"
              maxLength={100}
              required
            />
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="calisan-tel">
              Telefon <em>· isteğe bağlı</em>
            </label>
            <input
              id="calisan-tel"
              className="adm-input"
              type="tel"
              value={phone}
              onChange={(event) => onPhone(event.target.value)}
              placeholder="05XX XXX XX XX"
              autoComplete="tel"
              maxLength={30}
            />
            <span className="adm-hint">Yalnızca siz görürsünüz; müşteriye gösterilmez.</span>
          </div>
        </div>

        <fieldset className="adm-field" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="adm-label" style={{ marginBottom: 6 }}>Görev</legend>
          <div className="adm-role-grid">
            {ROLES.map((item) => (
              <label key={item.value} className={`adm-role ${role === item.value ? "is-active" : ""}`}>
                <input
                  type="radio"
                  name="calisan-gorev"
                  value={item.value}
                  checked={role === item.value}
                  onChange={() => onRole(item.value)}
                />
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="adm-switch-row">
          <span>
            <strong>Çalışan aktif</strong>
            <small className={isActive ? "is-open" : "is-closed"}>
              {isActive ? "Değerlendirme ekranında görünür" : "Değerlendirme ekranında görünmez"}
            </small>
          </span>
          <input
            type="checkbox"
            className="adm-switch"
            checked={isActive}
            onChange={(event) => onActive(event.target.checked)}
          />
        </label>

        {error && (
          <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
            <AdminIcon name="alert" size={16} />
            {error}
          </p>
        )}

        {success && (
          <p className="adm-alert adm-alert-ok" role="status" style={{ margin: 0 }}>
            <AdminIcon name="check" size={16} />
            {success.replace(/^[✓✅]\s*/, "")}
          </p>
        )}

        <div className="adm-form-actions" style={{ justifyContent: onDelete ? "space-between" : "flex-end" }}>
          {onDelete && (
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-text-danger"
              onClick={onDelete}
              disabled={deleting || loading}
            >
              <AdminIcon name="trash" size={16} />
              {deleting ? "Siliniyor…" : "Çalışanı sil"}
            </button>
          )}
          <span style={{ display: "flex", gap: 8 }}>
            <Link className="adm-btn" href="/admin/calisanlar">Vazgeç</Link>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={loading || deleting}>
              <AdminIcon name={mode === "new" ? "plus" : "save"} size={16} />
              {loading ? "Kaydediliyor…" : mode === "new" ? "Çalışanı ekle" : "Kaydet"}
            </button>
          </span>
        </div>
      </form>

      {extra}
    </main>
  );
}
