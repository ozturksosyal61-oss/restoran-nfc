"use client";

import { useActionState } from "react";
import AdminIcon from "../AdminIcon";
import { saveReportEmail, sendTestReport, type ReportEmailState } from "./actions";

// Dönem özeti: "Bu özeti her pazartesi e-postayla al".
export default function ReportEmailCard({
  enabled,
  email,
  loginEmail,
}: {
  enabled: boolean;
  email: string | null;
  loginEmail: string | null;
}) {
  const [saveState, save, saving] = useActionState<ReportEmailState, FormData>(saveReportEmail, null);
  const [testState, test, testing] = useActionState<ReportEmailState, FormData>(sendTestReport, null);

  return (
    <section className="adm-card adm-no-print" aria-labelledby="rapor-eposta">
      <div className="adm-card-head">
        <div>
          <h2 id="rapor-eposta">Haftalık rapor e-postası</h2>
          <p>Her pazartesi sabah geçen haftanın özeti e-postanıza gelir.</p>
        </div>
      </div>

      <form action={save} className="adm-form" style={{ gap: 14 }}>
        <label className="adm-switch-row" style={{ margin: 0 }}>
          <span>
            <strong>Raporu e-postayla gönder</strong>
            <small className={enabled ? "is-open" : "is-closed"}>{enabled ? "Açık" : "Kapalı"}</small>
          </span>
          <input type="checkbox" name="enabled" className="adm-switch" defaultChecked={enabled} />
        </label>

        <div className="adm-field">
          <label className="adm-label" htmlFor="rapor-alici">
            Alıcı <em>· boş bırakılırsa giriş e-postanız</em>
          </label>
          <input
            id="rapor-alici"
            name="email"
            type="email"
            className="adm-input"
            defaultValue={email ?? ""}
            placeholder={loginEmail ?? "ornek@isletme.com"}
            maxLength={200}
            autoComplete="email"
          />
        </div>

        <div className="adm-form-actions" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="submit" formAction={test} className="adm-btn" disabled={testing || saving}>
            <AdminIcon name="mail" size={16} />
            {testing ? "Gönderiliyor…" : "Deneme gönder"}
          </button>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={saving || testing}>
            <AdminIcon name="save" size={16} />
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>

      {[saveState, testState].map((message, index) =>
        message ? (
          <p
            key={index}
            className={`adm-alert ${message.tone === "ok" ? "adm-alert-ok" : "adm-alert-error"}`}
            role={message.tone === "ok" ? "status" : "alert"}
            style={{ margin: "12px 0 0" }}
          >
            <AdminIcon name={message.tone === "ok" ? "check" : "alert"} size={16} />
            {message.text}
          </p>
        ) : null
      )}
    </section>
  );
}
