"use client";

import { useActionState, useState } from "react";
import AdminIcon from "../../../admin/AdminIcon";
import { CredentialsBox, ResultNote } from "../../SystemUi";
import { formatDateTime } from "../../format";
import {
  addManager,
  changeManagerEmail,
  removeManager,
  resetManagerPassword,
} from "../actions";

type Manager = {
  user_id: string;
  email: string | null;
  role: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
};

type Panel = "password" | "email" | "remove" | null;

// Restoran yöneticilerinin giriş bilgileri. Şifreler Supabase'de şifreli
// tutulduğu için okunamaz; sistem sahibi yeni şifre belirler ve o şifre
// yalnızca bir kez gösterilir.
export default function ManagerAccess({
  restaurantId,
  managers,
}: {
  restaurantId: number;
  managers: Manager[];
}) {
  const [adding, setAdding] = useState(managers.length === 0);

  return (
    <section className="adm-card" aria-labelledby="yonetici-baslik">
      <div className="adm-card-head">
        <div>
          <h2 id="yonetici-baslik">Yönetici giriş bilgileri</h2>
          <p>
            İşletme paneline bu hesaplarla girilir. Bilgiler yalnızca sistem panelinde görünür.
          </p>
        </div>
        {!adding && (
          <button type="button" className="adm-btn adm-btn-sm" onClick={() => setAdding(true)}>
            <AdminIcon name="plus" size={15} />
            Yönetici ekle
          </button>
        )}
      </div>

      {managers.length === 0 && !adding && (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          Bu restorana bağlı yönetici yok; işletme paneline kimse giriş yapamaz.
        </p>
      )}

      {managers.length > 0 && (
        <ul className="sys-managers">
          {managers.map((manager) => (
            <ManagerRow key={manager.user_id} restaurantId={restaurantId} manager={manager} />
          ))}
        </ul>
      )}

      {adding && (
        <AddManagerForm
          restaurantId={restaurantId}
          onCancel={managers.length > 0 ? () => setAdding(false) : undefined}
        />
      )}
    </section>
  );
}

function ManagerRow({ restaurantId, manager }: { restaurantId: number; manager: Manager }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [passwordResult, passwordAction, passwordPending] = useActionState(resetManagerPassword, null);
  const [emailResult, emailAction, emailPending] = useActionState(changeManagerEmail, null);
  const [removeResult, removeAction, removePending] = useActionState(removeManager, null);

  const lastLogin = formatDateTime(manager.last_sign_in_at);

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <li className="sys-manager">
      <div className="sys-manager-main">
        <span className="sys-manager-avatar" aria-hidden="true">
          <AdminIcon name="user" size={17} />
        </span>
        <span className="sys-manager-text">
          <strong>{manager.email ?? "E-posta okunamadı"}</strong>
          <small>
            {manager.role === "manager" || !manager.role ? "Yönetici" : manager.role}
            {" · "}
            {lastLogin ? `Son giriş ${lastLogin}` : "Henüz giriş yapmadı"}
          </small>
        </span>
        <span className="sys-manager-actions">
          <button
            type="button"
            className={`adm-btn adm-btn-sm ${panel === "password" ? "is-on" : ""}`}
            onClick={() => toggle("password")}
            aria-expanded={panel === "password"}
          >
            <AdminIcon name="lock" size={14} />
            Şifre belirle
          </button>
          <button
            type="button"
            className={`adm-btn adm-btn-sm adm-btn-icon ${panel === "email" ? "is-on" : ""}`}
            onClick={() => toggle("email")}
            aria-expanded={panel === "email"}
            aria-label="Giriş e-postasını değiştir"
            title="E-postayı değiştir"
          >
            <AdminIcon name="mail" size={15} />
          </button>
          <button
            type="button"
            className={`adm-btn adm-btn-sm adm-btn-icon adm-btn-ghost adm-text-danger ${panel === "remove" ? "is-on" : ""}`}
            onClick={() => toggle("remove")}
            aria-expanded={panel === "remove"}
            aria-label="Yöneticinin erişimini kaldır"
            title="Erişimi kaldır"
          >
            <AdminIcon name="trash" size={15} />
          </button>
        </span>
      </div>

      {panel === "password" && (
        <form action={passwordAction} className="sys-manager-panel">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input type="hidden" name="user_id" value={manager.user_id} />
          <div className="adm-field">
            <label className="adm-label" htmlFor={`sifre-${manager.user_id}`}>
              Yeni şifre <em>· boş bırakırsanız güçlü bir şifre oluşturulur</em>
            </label>
            <div className="sys-inline">
              <input
                id={`sifre-${manager.user_id}`}
                name="password"
                className="adm-input"
                type="text"
                minLength={8}
                autoComplete="new-password"
                placeholder="En az 8 karakter"
              />
              <button type="submit" className="adm-btn adm-btn-primary" disabled={passwordPending}>
                {passwordPending ? "Kaydediliyor…" : "Şifreyi kaydet"}
              </button>
            </div>
          </div>
          {passwordResult?.credentials ? (
            <CredentialsBox
              email={passwordResult.credentials.email}
              password={passwordResult.credentials.password}
            />
          ) : (
            <ResultNote result={passwordResult} />
          )}
        </form>
      )}

      {panel === "email" && (
        <form action={emailAction} className="sys-manager-panel">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input type="hidden" name="user_id" value={manager.user_id} />
          <div className="adm-field">
            <label className="adm-label" htmlFor={`eposta-${manager.user_id}`}>
              Yeni giriş e-postası
            </label>
            <div className="sys-inline">
              <input
                id={`eposta-${manager.user_id}`}
                name="email"
                className="adm-input"
                type="email"
                required
                defaultValue={manager.email ?? ""}
                autoComplete="off"
              />
              <button type="submit" className="adm-btn adm-btn-primary" disabled={emailPending}>
                {emailPending ? "Kaydediliyor…" : "E-postayı kaydet"}
              </button>
            </div>
            <span className="adm-hint">Şifre değişmez; yönetici yeni e-posta ve mevcut şifresiyle girer.</span>
          </div>
          <ResultNote result={emailResult} />
        </form>
      )}

      {panel === "remove" && (
        <form action={removeAction} className="sys-manager-panel is-danger">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input type="hidden" name="user_id" value={manager.user_id} />
          <p>
            <strong>{manager.email ?? "Bu yönetici"}</strong> işletme paneline bir daha giremez.
            Hesap silinmez; istediğinizde yeniden bağlayabilirsiniz.
          </p>
          <div className="sys-inline">
            <button type="button" className="adm-btn" onClick={() => setPanel(null)}>
              Vazgeç
            </button>
            <button type="submit" className="adm-btn adm-btn-danger" disabled={removePending}>
              {removePending ? "Kaldırılıyor…" : "Erişimi kaldır"}
            </button>
          </div>
          <ResultNote result={removeResult} />
        </form>
      )}
    </li>
  );
}

function AddManagerForm({
  restaurantId,
  onCancel,
}: {
  restaurantId: number;
  onCancel?: () => void;
}) {
  const [result, action, pending] = useActionState(addManager, null);

  if (result?.ok && result.credentials) {
    return (
      <div className="sys-manager-panel">
        <ResultNote result={{ ok: true, message: result.message }} />
        <CredentialsBox email={result.credentials.email} password={result.credentials.password} />
      </div>
    );
  }

  return (
    <form action={action} className="sys-manager-panel">
      <input type="hidden" name="restaurant_id" value={restaurantId} />
      <strong className="sys-panel-title">Yeni yönetici</strong>
      <div className="adm-form-grid">
        <div className="adm-field">
          <label className="adm-label" htmlFor="yeni-yonetici-eposta">E-posta</label>
          <input
            id="yeni-yonetici-eposta"
            name="email"
            className="adm-input"
            type="email"
            required
            placeholder="yonetici@restoran.com"
            autoComplete="off"
          />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="yeni-yonetici-sifre">
            Şifre <em>· boşsa otomatik</em>
          </label>
          <input
            id="yeni-yonetici-sifre"
            name="password"
            className="adm-input"
            type="text"
            minLength={8}
            placeholder="En az 8 karakter"
            autoComplete="new-password"
          />
        </div>
      </div>
      <ResultNote result={result} />
      <div className="sys-inline" style={{ justifyContent: "flex-end" }}>
        {onCancel && (
          <button type="button" className="adm-btn" onClick={onCancel}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          <AdminIcon name="plus" size={15} />
          {pending ? "Ekleniyor…" : "Yöneticiyi ekle"}
        </button>
      </div>
    </form>
  );
}
