"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import AdminIcon from "../AdminIcon";
import { PROVIDERS, type PaymentMode, type PaymentProvider } from "../../../lib/payments/providers";
import {
  removePaymentSettings,
  runTestPayment,
  savePaymentSettings,
  setPaymentEnabled,
  type PaymentActionResult,
} from "./actions";

function Submit({
  children,
  pendingText,
  className = "adm-btn adm-btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}

function Result({ result }: { result: PaymentActionResult }) {
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

function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="adm-field adm-field-full">
      <label className="adm-label" htmlFor={id}>{label}</label>
      <div className="adm-pay-copy">
        <input id={id} className="adm-input" value={value} readOnly onFocus={(event) => event.target.select()} />
        <button
          type="button"
          className="adm-btn"
          onClick={() => {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
        >
          <AdminIcon name={copied ? "check" : "copy"} size={16} />
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}

export function SettingsForm({
  savedProvider,
  savedMode,
  hints,
  notificationUrl,
}: {
  savedProvider: PaymentProvider | null;
  savedMode: PaymentMode;
  hints: Record<string, string>;
  notificationUrl: string;
}) {
  const [result, action] = useActionState(savePaymentSettings, null);
  const [provider, setProvider] = useState<PaymentProvider>(savedProvider ?? "iyzico");
  const [mode, setMode] = useState<PaymentMode>(savedMode);
  const info = PROVIDERS[provider];
  const sameProvider = provider === savedProvider;

  return (
    <form action={action} className="adm-form">
      <fieldset className="adm-pay-fieldset">
        <legend className="adm-label">Ödeme sağlayıcısı</legend>
        <div className="adm-role-grid">
          {Object.values(PROVIDERS).map((item) => (
            <label key={item.id} className={`adm-role ${provider === item.id ? "is-active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value={item.id}
                checked={provider === item.id}
                onChange={() => setProvider(item.id)}
              />
              <strong>{item.name}</strong>
              <small>{item.summary}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="adm-pay-fieldset">
        <legend className="adm-label">Çalışma modu</legend>
        <div className="adm-role-grid">
          <label className={`adm-role ${mode === "test" ? "is-active" : ""}`}>
            <input type="radio" name="mode" value="test" checked={mode === "test"} onChange={() => setMode("test")} />
            <strong>Test modu</strong>
            <small>Test kartıyla denenir, gerçek para çekilmez.</small>
          </label>
          <label className={`adm-role ${mode === "live" ? "is-active" : ""}`}>
            <input type="radio" name="mode" value="live" checked={mode === "live"} onChange={() => setMode("live")} />
            <strong>Canlı mod</strong>
            <small>Gerçek kartlarla gerçek ödeme alınır.</small>
          </label>
        </div>
      </fieldset>

      <div className="adm-form-grid">
        {info.fields.map((field) => {
          const saved = sameProvider ? hints[field.name] : undefined;
          return (
            <div key={`${provider}-${field.name}`} className="adm-field">
              <label className="adm-label" htmlFor={`pay-${field.name}`}>{field.label}</label>
              <input
                id={`pay-${field.name}`}
                name={field.name}
                className="adm-input"
                type={field.secret ? "password" : "text"}
                autoComplete="off"
                spellCheck={false}
                inputMode={field.name === "merchantId" ? "numeric" : undefined}
                defaultValue={!field.secret && saved ? saved : undefined}
                placeholder={field.secret && saved ? `Kayıtlı: ${saved}` : field.placeholder}
              />
              {field.secret && saved && <span className="adm-hint">Değiştirmek istemiyorsanız boş bırakın.</span>}
            </div>
          );
        })}
      </div>

      <p className="adm-hint" style={{ margin: 0 }}>
        <strong>Bilgileri nerede bulurum?</strong> {info.whereToFind}
      </p>

      {provider === "paytr" && (
        <CopyField id="pay-bildirim-url" label="PayTR Bildirim URL (PayTR paneline kaydedin)" value={notificationUrl} />
      )}

      <Result result={result} />

      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Kaydediliyor…">
          <AdminIcon name="lock" size={16} />
          Şifreleyerek kaydet
        </Submit>
      </div>
    </form>
  );
}

export function TestPaymentForm({ disabled }: { disabled: boolean }) {
  const [result, action] = useActionState(runTestPayment, null);

  // Ödeme sayfası sağlayıcının sitesinde (iyzico) ya da bizim çerçeve sayfamızda (PayTR) açılır.
  useEffect(() => {
    if (result?.ok && result.redirectUrl) window.location.assign(result.redirectUrl);
  }, [result]);

  return (
    <form action={action} className="adm-form">
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Ödeme sayfası hazırlanıyor…" disabled={disabled}>
          <AdminIcon name="card" size={16} />
          1 ₺ test ödemesi yap
        </Submit>
      </div>
    </form>
  );
}

export function RemoveSettingsForm() {
  const [result, action] = useActionState(removePaymentSettings, null);
  return (
    <form
      action={action}
      className="adm-form"
      onSubmit={(event) => {
        if (!window.confirm("Ödeme bağlantısı kaldırılsın mı? Kayıtlı API anahtarları silinir.")) event.preventDefault();
      }}
    >
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Kaldırılıyor…" className="adm-btn adm-btn-danger">
          <AdminIcon name="trash" size={16} />
          Bağlantıyı kaldır
        </Submit>
      </div>
    </form>
  );
}

// Sonuç henüz gelmediyse (PayTR bildirimi birkaç saniye sürebilir) sayfayı yeniler.
export function PendingRefresher() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 20) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}

export function EnableForm({ enabled, verified }: { enabled: boolean; verified: boolean }) {
  const [result, action] = useActionState(setPaymentEnabled, null);
  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit
          pendingText="Kaydediliyor…"
          className={enabled ? "adm-btn" : "adm-btn adm-btn-primary"}
          disabled={!enabled && !verified}
        >
          <AdminIcon name={enabled ? "lock" : "check"} size={16} />
          {enabled ? "Kartla ödemeyi kapat" : "Kartla ödemeyi aç"}
        </Submit>
      </div>
    </form>
  );
}
