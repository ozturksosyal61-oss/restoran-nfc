"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon from "../../AdminIcon";
import {
  changeStaffPassword,
  createStaffLogin,
  deleteStaffLogin,
  setStaffLoginActive,
  type StaffLoginResult,
} from "./staff-actions";

type Account = { email: string; is_active: boolean; last_seen_at: string | null } | null;

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

function Result({ result }: { result: StaffLoginResult }) {
  if (!result) return null;
  return (
    <p className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`} role={result.ok ? "status" : "alert"} style={{ margin: 0 }}>
      <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
      {result.message}
    </p>
  );
}

function PasswordField({ id, label }: { id: string; label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="adm-field">
      <label className="adm-label" htmlFor={id}>{label}</label>
      <div className="adm-input-group">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="En az 8 karakter"
        />
        <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setVisible(!visible)}>
          {visible ? "Gizle" : "Göster"}
        </button>
      </div>
    </div>
  );
}

function formatSeen(value: string | null) {
  if (!value) return "Henüz giriş yapmadı";
  return `Son görülme: ${new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function StaffLoginCard({
  employeeId,
  role,
  account,
  allowed,
  loginUrl,
}: {
  employeeId: number;
  role: string;
  account: Account;
  allowed: boolean;
  loginUrl: string;
}) {
  const [createResult, createAction] = useActionState(createStaffLogin, null);
  const [passwordResult, passwordAction] = useActionState(changeStaffPassword, null);
  const [activeResult, activeAction] = useActionState(setStaffLoginActive, null);
  const [deleteResult, deleteAction] = useActionState(deleteStaffLogin, null);
  const staffRole = role === "garson" || role === "mutfak";
  const screen = role === "mutfak" ? "mutfak ekranını" : "garson ekranını";

  return (
    <section className="adm-card" aria-labelledby="panel-girisi" style={{ marginTop: 16 }}>
      <div className="adm-card-head">
        <div>
          <h2 id="panel-girisi">Panel girişi</h2>
          <p>
            Garson ve mutfak çalışanları kendi e-posta ve şifreleriyle yalnızca kendi ekranlarını görür; yönetim
            paneline, raporlara ve ayarlara giremez.
          </p>
        </div>
      </div>

      {!allowed ? (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="lock" size={16} />
          Garson ve mutfak girişi, sipariş alan Pro ve Premium paketlerde kullanılabilir.
        </p>
      ) : !staffRole && !account ? (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          Giriş hesabı garson ya da mutfak görevindeki çalışanlara açılır. Görevi değiştirip kaydettikten sonra
          buradan hesap açabilirsiniz.
        </p>
      ) : !account ? (
        <form action={createAction} className="adm-form">
          <input type="hidden" name="employee_id" value={employeeId} />
          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label" htmlFor="personel-eposta">E-posta</label>
              <input
                id="personel-eposta"
                name="email"
                className="adm-input"
                type="email"
                autoComplete="off"
                required
                placeholder="ornek@eposta.com"
              />
            </div>
            <PasswordField id="personel-sifre" label="Şifre" />
          </div>
          <p className="adm-hint" style={{ margin: 0 }}>
            Çalışan bu bilgilerle <b>{loginUrl}</b> adresinden giriş yapar ve doğrudan {screen} görür.
          </p>
          <Result result={createResult} />
          <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
            <Submit pendingText="Hesap açılıyor…">
              <AdminIcon name="user" size={16} />
              Giriş hesabı aç
            </Submit>
          </div>
        </form>
      ) : (
        <div className="adm-form">
          <div className="adm-pay-status">
            <span className="adm-badge s-accent">{account.email}</span>
            <span className={`adm-badge is-dot ${account.is_active ? "s-ok" : "s-danger"}`}>
              {account.is_active ? "Giriş açık" : "Giriş kapalı"}
            </span>
            <span className="adm-hint">{formatSeen(account.last_seen_at)}</span>
          </div>
          <p className="adm-hint" style={{ margin: 0 }}>
            Giriş adresi: <b>{loginUrl}</b>
            {!staffRole && " · Çalışanın görevi garson ya da mutfak olmadığı için ekran açılmaz."}
          </p>

          <form action={passwordAction} className="adm-form">
            <input type="hidden" name="employee_id" value={employeeId} />
            <PasswordField id="personel-yeni-sifre" label="Yeni şifre" />
            <Result result={passwordResult} />
            <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
              <Submit pendingText="Kaydediliyor…" className="adm-btn">
                <AdminIcon name="lock" size={16} />
                Şifreyi değiştir
              </Submit>
            </div>
          </form>

          <div className="adm-divider" />

          <Result result={activeResult ?? deleteResult} />
          <div className="adm-form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
            <form action={activeAction}>
              <input type="hidden" name="employee_id" value={employeeId} />
              <input type="hidden" name="active" value={account.is_active ? "0" : "1"} />
              <Submit pendingText="Kaydediliyor…" className="adm-btn">
                <AdminIcon name={account.is_active ? "lock" : "check"} size={16} />
                {account.is_active ? "Girişi kapat" : "Girişi aç"}
              </Submit>
            </form>
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (!window.confirm("Giriş hesabı silinsin mi? Çalışan bir daha bu e-postayla giriş yapamaz.")) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="employee_id" value={employeeId} />
              <Submit pendingText="Siliniyor…" className="adm-btn adm-btn-ghost adm-text-danger">
                <AdminIcon name="trash" size={16} />
                Hesabı sil
              </Submit>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
