"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon from "../../AdminIcon";
import { MENU_LANGUAGES, type MenuLanguage } from "../../../../lib/menu-i18n";
import {
  saveManualTranslation,
  saveMenuLanguages,
  translateMenu,
  type LanguageResult,
} from "./actions";

function Result({ result }: { result: LanguageResult }) {
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

function SubmitButton({
  children,
  pendingText,
  className = "adm-btn adm-btn-primary",
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} name={name} value={value} disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}

/* ---------------- Dil seçimi ---------------- */

export function LanguagePicker({ selected }: { selected: MenuLanguage[] }) {
  const [result, action] = useActionState(saveMenuLanguages, null);

  return (
    <form action={action} className="adm-form">
      <div className="adm-lang-grid">
        {MENU_LANGUAGES.map((language) => (
          <label key={language.code} className="adm-check">
            <input
              type="checkbox"
              name="languages"
              value={language.code}
              defaultChecked={selected.includes(language.code)}
            />
            <span>
              <strong>{language.turkish}</strong>
              <span lang={language.code}>{language.label}</span>
            </span>
          </label>
        ))}
      </div>

      <Result result={result} />

      <div className="adm-form-actions">
        <SubmitButton pendingText="Kaydediliyor…">
          <AdminIcon name="save" size={16} />
          Dilleri kaydet
        </SubmitButton>
      </div>
    </form>
  );
}

/* ---------------- Otomatik çeviri ---------------- */

export function TranslateControls({ disabled, hasPending }: { disabled: boolean; hasPending: boolean }) {
  const [result, action] = useActionState(translateMenu, null);

  return (
    <form action={action} className="adm-form">
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <SubmitButton
          pendingText="Çevriliyor… (1-2 dakika sürebilir)"
          name="mode"
          value="missing"
          disabled={disabled || !hasPending}
        >
          <AdminIcon name="refresh" size={16} />
          Eksik çevirileri tamamla
        </SubmitButton>
        <SubmitButton
          pendingText="Çevriliyor…"
          className="adm-btn"
          name="mode"
          value="all"
          disabled={disabled}
        >
          Tümünü yeniden çevir
        </SubmitButton>
      </div>
    </form>
  );
}

/* ---------------- Elle düzeltme ---------------- */

export function TranslationRow({
  kind,
  id,
  language,
  sourceName,
  sourceDescription,
  name,
  description,
  status,
}: {
  kind: "category" | "product";
  id: number;
  language: MenuLanguage;
  sourceName: string;
  sourceDescription: string | null;
  name: string;
  description: string;
  status: "ok" | "stale" | "missing";
}) {
  const [result, action] = useActionState(saveManualTranslation, null);
  const rtl = language === "ar";

  return (
    <li className="adm-tr-row">
      <div className="adm-tr-source">
        <strong>{sourceName}</strong>
        {sourceDescription?.trim() && <small>{sourceDescription}</small>}
        {status !== "ok" && (
          <span className={`adm-badge ${status === "missing" ? "s-danger" : "s-pending"}`}>
            {status === "missing" ? "Çevrilmedi" : "Türkçesi değişti"}
          </span>
        )}
      </div>

      <form action={action} className="adm-tr-form">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="language" value={language} />
        <input
          className="adm-input"
          name="name"
          defaultValue={name}
          placeholder="Çeviri"
          aria-label={`${sourceName} çevirisi`}
          lang={language}
          dir={rtl ? "rtl" : "ltr"}
          maxLength={200}
          required
        />
        {kind === "product" && sourceDescription?.trim() && (
          <textarea
            className="adm-textarea"
            name="description"
            defaultValue={description}
            placeholder="Açıklama çevirisi"
            aria-label={`${sourceName} açıklama çevirisi`}
            lang={language}
            dir={rtl ? "rtl" : "ltr"}
            rows={2}
            maxLength={2000}
          />
        )}
        <div className="adm-tr-actions">
          <SubmitButton pendingText="…" className="adm-btn adm-btn-sm">
            <AdminIcon name="save" size={14} />
            Kaydet
          </SubmitButton>
          {result && (
            <span className={result.ok ? "adm-tr-ok" : "adm-text-danger"} role={result.ok ? "status" : "alert"}>
              {result.message}
            </span>
          )}
        </div>
      </form>
    </li>
  );
}
