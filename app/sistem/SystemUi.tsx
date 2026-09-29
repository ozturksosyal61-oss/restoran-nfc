"use client";

import { useState, useSyncExternalStore } from "react";
import AdminIcon from "../admin/AdminIcon";

const noopSubscribe = () => () => {};

// İşlem sonucunu (başarılı / hata) gösteren satır.
export function ResultNote({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result) return null;

  return (
    <p
      className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`}
      role={result.ok ? "status" : "alert"}
      style={{ margin: 0 }}
    >
      <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
      {result.message}
    </p>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Pano izni yoksa kullanıcı metni elle seçebilir.
    }
  }

  return (
    <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={copy} aria-label={label}>
      <AdminIcon name={copied ? "check" : "copy"} size={14} />
      {copied ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}

// Yeni oluşturulan ya da sıfırlanan giriş bilgileri. Şifre veritabanında
// açık hâliyle tutulmadığı için yalnızca bu an gösterilir.
export function CredentialsBox({
  email,
  password,
  loginUrl = "/admin/login",
}: {
  email: string;
  password: string;
  loginUrl?: string;
}) {
  // Sunucuda adres bilinmez; tarayıcıda tam adres gösterilir.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => ""
  );
  const fullUrl = `${origin}${loginUrl}`;
  const all = `Giriş adresi: ${fullUrl}\nE-posta: ${email}\nŞifre: ${password}`;

  return (
    <div className="sys-cred" role="status">
      <div className="sys-cred-head">
        <span>
          <AdminIcon name="lock" size={15} />
          Giriş bilgileri · yalnızca şimdi görünür
        </span>
        <CopyButton value={all} label="Tüm giriş bilgilerini kopyala" />
      </div>
      <dl>
        <div>
          <dt>Giriş adresi</dt>
          <dd>{fullUrl}</dd>
        </div>
        <div>
          <dt>E-posta</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Şifre</dt>
          <dd className="sys-cred-secret">{password}</dd>
        </div>
      </dl>
      <p>Bu sayfadan ayrıldıktan sonra şifre bir daha gösterilemez; gerekirse yenisini belirlersiniz.</p>
    </div>
  );
}
