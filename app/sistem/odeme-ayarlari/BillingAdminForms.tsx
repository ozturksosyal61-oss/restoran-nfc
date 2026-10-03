"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon from "../../admin/AdminIcon";
import { ResultNote } from "../SystemUi";
import {
  disableAutoBilling,
  enableAutoBilling,
  extendTrial,
  saveBillingSettings,
  setSuspended,
  syncPricingPlans,
  syncRestaurantBilling,
  testBillingConnection,
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

export function BillingSettingsForm({
  mode,
  hints,
  trialDays,
  graceDays,
}: {
  mode: "test" | "live";
  hints: Record<string, string>;
  trialDays: number;
  graceDays: number;
}) {
  const [result, action] = useActionState(saveBillingSettings, null);
  const [selectedMode, setSelectedMode] = useState(mode);

  return (
    <form action={action} className="adm-form" autoComplete="off">
      <div className="adm-role-grid">
        {(["test", "live"] as const).map((value) => (
          <label key={value} className={`adm-role ${selectedMode === value ? "is-active" : ""}`}>
            <input
              type="radio"
              name="mode"
              value={value}
              checked={selectedMode === value}
              onChange={() => setSelectedMode(value)}
            />
            <strong>{value === "test" ? "Test modu" : "Canlı mod"}</strong>
            <small>{value === "test" ? "iyzico sandbox; gerçek para çekilmez." : "Restoranların kartından gerçek ödeme alınır."}</small>
          </label>
        ))}
      </div>
      <div className="adm-form-grid">
        <div className="adm-field">
          <label className="adm-label" htmlFor="iyz-api">API anahtarı</label>
          <input id="iyz-api" name="apiKey" type="password" className="adm-input" placeholder={hints.apiKey ? `Kayıtlı: ${hints.apiKey}` : "sandbox-… ya da canlı anahtar"} />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="iyz-secret">Güvenlik anahtarı (Secret key)</label>
          <input id="iyz-secret" name="secretKey" type="password" className="adm-input" placeholder={hints.secretKey ? `Kayıtlı: ${hints.secretKey}` : ""} />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="iyz-merchant">Üye işyeri no (bildirim imzası için)</label>
          <input id="iyz-merchant" name="merchantId" className="adm-input" inputMode="numeric" defaultValue={hints.merchantId ?? ""} />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="iyz-trial">Deneme süresi (gün)</label>
          <input id="iyz-trial" name="trial_days" type="number" min={0} max={90} className="adm-input" defaultValue={trialDays} />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="iyz-grace">Ödeme alınamazsa ek süre (gün)</label>
          <input id="iyz-grace" name="grace_days" type="number" min={0} max={60} className="adm-input" defaultValue={graceDays} />
        </div>
      </div>
      <p className="adm-hint" style={{ margin: 0 }}>
        Kayıtlı anahtarı değiştirmek istemiyorsanız boş bırakın. Anahtarlar şifrelenerek saklanır.
      </p>
      <ResultNote result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <Submit pendingText="Kaydediliyor…">
          <AdminIcon name="lock" size={16} />
          Kaydet
        </Submit>
      </div>
    </form>
  );
}

export function ConnectionActions({ disabled }: { disabled: boolean }) {
  const [testResult, testAction] = useActionState(testBillingConnection, null);
  const [syncResult, syncAction] = useActionState(syncPricingPlans, null);
  return (
    <div className="adm-form">
      <ResultNote result={syncResult ?? testResult} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <form action={testAction}>
          <Submit pendingText="Deneniyor…" className="adm-btn" disabled={disabled}>
            <AdminIcon name="check" size={16} />
            Bağlantıyı dene
          </Submit>
        </form>
        <form action={syncAction}>
          <Submit pendingText="Aktarılıyor…" disabled={disabled}>
            <AdminIcon name="refresh" size={16} />
            Paketleri iyzico&apos;ya aktar
          </Submit>
        </form>
      </div>
    </div>
  );
}

type PlanChoice = { id: string; name: string };

export function RestaurantBillingControls({
  restaurantId,
  hasAccount,
  status,
  hasSubscription,
  plans,
}: {
  restaurantId: number;
  hasAccount: boolean;
  status: string | null;
  hasSubscription: boolean;
  plans: PlanChoice[];
}) {
  const [enableResult, enableAction] = useActionState(enableAutoBilling, null);
  const [trialResult, trialAction] = useActionState(extendTrial, null);
  const [suspendResult, suspendAction] = useActionState(setSuspended, null);
  const [syncResult, syncAction] = useActionState(syncRestaurantBilling, null);
  const [disableResult, disableAction] = useActionState(disableAutoBilling, null);
  const result = disableResult ?? syncResult ?? suspendResult ?? trialResult;

  if (!hasAccount) {
    return (
      <form action={enableAction} className="adm-form">
        <input type="hidden" name="restaurant_id" value={restaurantId} />
        <div className="adm-form-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="oto-paket">Paket</label>
            <select id="oto-paket" name="plan_id" className="adm-select" defaultValue={plans[plans.length - 1]?.id}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="oto-donem">Dönem</label>
            <select id="oto-donem" name="interval" className="adm-select" defaultValue="monthly">
              <option value="monthly">Aylık</option>
              <option value="yearly">Yıllık</option>
            </select>
          </div>
        </div>
        <ResultNote result={enableResult} />
        <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
          <Submit pendingText="Açılıyor…">
            <AdminIcon name="card" size={16} />
            Otomatik ödemeyi aç (deneme ile başlar)
          </Submit>
        </div>
      </form>
    );
  }

  return (
    <div className="adm-form">
      <ResultNote result={result} />
      <div className="adm-form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {status === "trial" && (
          <form action={trialAction}>
            <input type="hidden" name="restaurant_id" value={restaurantId} />
            <Submit pendingText="Uzatılıyor…" className="adm-btn adm-btn-sm">
              <AdminIcon name="clock" size={14} />
              Denemeyi 7 gün uzat
            </Submit>
          </form>
        )}
        {hasSubscription && (
          <form action={syncAction}>
            <input type="hidden" name="restaurant_id" value={restaurantId} />
            <Submit pendingText="Okunuyor…" className="adm-btn adm-btn-sm">
              <AdminIcon name="refresh" size={14} />
              iyzico&apos;dan yenile
            </Submit>
          </form>
        )}
        <form
          action={suspendAction}
          onSubmit={(event) => {
            if (status !== "suspended" && !window.confirm("Hizmet durdurulsun mu? Panel ve müşteri menüsü kapanır.")) event.preventDefault();
          }}
        >
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input type="hidden" name="suspend" value={status === "suspended" ? "0" : "1"} />
          <Submit pendingText="Kaydediliyor…" className="adm-btn adm-btn-sm">
            <AdminIcon name={status === "suspended" ? "check" : "lock"} size={14} />
            {status === "suspended" ? "Hizmeti aç" : "Hizmeti durdur"}
          </Submit>
        </form>
        <form
          action={disableAction}
          onSubmit={(event) => {
            if (!window.confirm("Otomatik ödeme kapatılsın mı? iyzico'daki abonelik iptal edilir; restoran elle yönetilir.")) event.preventDefault();
          }}
        >
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <Submit pendingText="Kapatılıyor…" className="adm-btn adm-btn-sm adm-btn-ghost adm-text-danger">
            Elle yönetime al
          </Submit>
        </form>
      </div>
    </div>
  );
}
