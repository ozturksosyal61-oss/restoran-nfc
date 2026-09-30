"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon from "../../AdminIcon";
import { estimateCalories, saveCalories, type CalorieResult } from "./actions";

function Submit({
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

function Result({ result }: { result: CalorieResult }) {
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

export function EstimateControls({
  disabled,
  missing,
  aiCount,
}: {
  disabled: boolean;
  missing: number;
  aiCount: number;
}) {
  const [result, action] = useActionState(estimateCalories, null);

  return (
    <form action={action} className="adm-form">
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <Submit
          pendingText="Hesaplanıyor… (yarım dakika kadar)"
          name="mode"
          value="missing"
          disabled={disabled || missing === 0}
        >
          <AdminIcon name="sparkle" size={16} />
          {missing > 0 ? `Eksik ${missing} ürünü tahmin et` : "Eksik kalori yok"}
        </Submit>
        {aiCount > 0 && (
          <Submit pendingText="Hesaplanıyor…" className="adm-btn" name="mode" value="all" disabled={disabled}>
            Tahminleri yenile
          </Submit>
        )}
      </div>
    </form>
  );
}

export function CalorieRow({
  id,
  name,
  description,
  calories,
  source,
}: {
  id: number;
  name: string;
  description: string | null;
  calories: number | null;
  source: string | null;
}) {
  const [result, action] = useActionState(saveCalories, null);
  const inputId = `kalori-${id}`;

  return (
    <li className="adm-cal-row">
      <div className="adm-cal-name">
        <label htmlFor={inputId}>{name}</label>
        {description?.trim() && <small>{description}</small>}
      </div>

      <form action={action} className="adm-cal-form">
        <input type="hidden" name="id" value={id} />
        <span className="adm-cal-input">
          <input
            id={inputId}
            className="adm-input"
            name="calories"
            type="number"
            inputMode="numeric"
            min={0}
            max={5000}
            step={1}
            defaultValue={calories ?? ""}
            placeholder="—"
          />
          <span aria-hidden="true">kcal</span>
        </span>
        <Submit pendingText="…" className="adm-btn adm-btn-sm">
          Kaydet
        </Submit>
        {result ? (
          <span className={result.ok ? "adm-tr-ok" : "adm-text-danger"} role={result.ok ? "status" : "alert"}>
            {result.message}
          </span>
        ) : calories !== null ? (
          <span className={`adm-badge ${source === "manual" ? "s-ok" : "s-accent"}`}>
            {source === "manual" ? "Elle girildi" : "Tahmin"}
          </span>
        ) : null}
      </form>
    </li>
  );
}
