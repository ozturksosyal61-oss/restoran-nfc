"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon from "../AdminIcon";
import {
  cancelAction,
  cardUpdateAction,
  changePlanAction,
  startSubscriptionAction,
  type BillingActionResult,
} from "./actions";

export type PlanOption = {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  monthlyReady: boolean;
  yearlyReady: boolean;
};

type Interval = "monthly" | "yearly";

function lira(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

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

function Result({ result }: { result: BillingActionResult }) {
  if (!result || (result.ok && result.checkout)) return null;
  return (
    <p className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`} role={result.ok ? "status" : "alert"} style={{ margin: 0 }}>
      <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
      {result.message}
    </p>
  );
}

// iyzico'nun ödeme formu: yanıttaki betik sayfaya eklenir, form aşağıdaki
// kutuya yerleşir. Kart bilgisi iyzico'nun alanlarına girilir.
function CheckoutBox({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = ref.current;
    if (!holder) return;
    const win = window as unknown as Record<string, unknown>;
    // Form ikinci kez açılırsa iyzico betiği yeniden başlasın.
    delete win.iyziInit;
    delete win.iyziUcsInit;

    const doc = new DOMParser().parseFromString(content, "text/html");
    const added: HTMLScriptElement[] = [];
    doc.querySelectorAll("script").forEach((source) => {
      const script = document.createElement("script");
      if (source.src) script.src = source.src;
      else script.text = source.textContent ?? "";
      document.body.appendChild(script);
      added.push(script);
    });
    return () => added.forEach((script) => script.remove());
  }, [content]);

  return (
    <div className="adm-bill-checkout" ref={ref}>
      <div id="iyzipay-checkout-form" className="responsive" />
    </div>
  );
}

function PlanPicker({ plans, planId, interval }: { plans: PlanOption[]; planId: string; interval: Interval }) {
  const [selected, setSelected] = useState(planId);
  const [period, setPeriod] = useState<Interval>(interval);

  return (
    <div className="adm-form">
      <input type="hidden" name="interval" value={period} />
      <div className="adm-seg" role="radiogroup" aria-label="Ödeme dönemi">
        {(["monthly", "yearly"] as Interval[]).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={period === value}
            className={period === value ? "is-active" : ""}
            onClick={() => setPeriod(value)}
          >
            {value === "monthly" ? "Aylık" : "Yıllık"}
          </button>
        ))}
      </div>
      <div className="adm-bill-plans" role="radiogroup" aria-label="Paket">
        {plans.map((plan) => {
          const ready = period === "monthly" ? plan.monthlyReady : plan.yearlyReady;
          const price = period === "monthly" ? plan.monthly : plan.yearly;
          return (
            <label key={plan.id} className={`adm-bill-plan ${selected === plan.id ? "is-active" : ""}`}>
              <input
                type="radio"
                name="plan_id"
                value={plan.id}
                checked={selected === plan.id}
                onChange={() => setSelected(plan.id)}
              />
              <strong>{plan.name}</strong>
              <span className="adm-bill-price">{lira(price)}</span>
              <small>{period === "monthly" ? "aylık" : "yıllık"} · KDV dahil{ready ? "" : " · henüz hazır değil"}</small>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function StartSubscriptionForm({
  plans,
  planId,
  interval,
  defaults,
  restart,
}: {
  plans: PlanOption[];
  planId: string;
  interval: Interval;
  defaults: Record<string, string>;
  restart: boolean;
}) {
  const [result, action] = useActionState(startSubscriptionAction, null);

  if (result?.ok && result.checkout) {
    return (
      <div className="adm-form">
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="lock" size={16} />
          {result.message} Kart bilginiz iyzico&apos;da saklanır; bizim sistemimize gelmez.
        </p>
        <CheckoutBox content={result.checkout} />
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`adm-field ${name === "address" ? "adm-field-full" : ""}`}>
      <label className="adm-label" htmlFor={`fatura-${name}`}>{label}</label>
      <input id={`fatura-${name}`} name={name} className="adm-input" defaultValue={defaults[name] ?? ""} required {...props} />
    </div>
  );

  return (
    <form action={action} className="adm-form">
      <PlanPicker plans={plans} planId={planId} interval={interval} />

      <div>
        <span className="adm-label">Fatura bilgileri</span>
        <p className="adm-hint" style={{ margin: "2px 0 0" }}>Aboneliğin ve faturanın sahibi; iyzico da bu bilgileri ister.</p>
      </div>
      <div className="adm-form-grid">
        {field("name", "Ad", { autoComplete: "given-name" })}
        {field("surname", "Soyad", { autoComplete: "family-name" })}
        {field("email", "E-posta", { type: "email", autoComplete: "email" })}
        {field("phone", "Cep telefonu", { type: "tel", autoComplete: "tel", placeholder: "05xx xxx xx xx" })}
        {field("identity", "T.C. kimlik no ya da vergi no", { inputMode: "numeric", maxLength: 11 })}
        {field("city", "Şehir", { autoComplete: "address-level1" })}
        {field("address", "Fatura adresi", { autoComplete: "street-address" })}
      </div>

      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Ödeme formu hazırlanıyor…">
          <AdminIcon name="card" size={16} />
          {restart ? "Aboneliği yeniden başlat" : "Kartı ekle ve aboneliği başlat"}
        </Submit>
      </div>
      <p className="adm-hint" style={{ margin: 0 }}>
        İlk ödeme kartınızı eklediğiniz gün alınır; sonra her dönem aynı gün otomatik yenilenir. İstediğiniz zaman iptal
        edebilirsiniz.
      </p>
    </form>
  );
}

export function CardUpdateButton() {
  const [result, action] = useActionState(cardUpdateAction, null);
  if (result?.ok && result.checkout) return <CheckoutBox content={result.checkout} />;
  return (
    <form action={action} className="adm-form">
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Kart formu açılıyor…" className="adm-btn">
          <AdminIcon name="card" size={16} />
          Kartı değiştir
        </Submit>
      </div>
    </form>
  );
}

export function ChangePlanForm({ plans, planId, interval }: { plans: PlanOption[]; planId: string; interval: Interval }) {
  const [result, action] = useActionState(changePlanAction, null);
  return (
    <form action={action} className="adm-form">
      <PlanPicker plans={plans} planId={planId} interval={interval} />
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Kaydediliyor…" className="adm-btn">
          Paketi değiştir
        </Submit>
      </div>
    </form>
  );
}

export function CancelForm() {
  const [result, action] = useActionState(cancelAction, null);
  return (
    <form
      action={action}
      className="adm-form"
      onSubmit={(event) => {
        if (!window.confirm("Aboneliğiniz iptal edilsin mi? Ödenmiş dönemin sonunda müşteri menünüz kapanır.")) {
          event.preventDefault();
        }
      }}
    >
      <Result result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="İptal ediliyor…" className="adm-btn adm-btn-ghost adm-text-danger">
          Aboneliği iptal et
        </Submit>
      </div>
    </form>
  );
}
