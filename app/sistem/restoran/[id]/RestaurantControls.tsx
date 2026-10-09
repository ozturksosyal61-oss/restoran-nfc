"use client";

import { useActionState, useState } from "react";
import AdminIcon from "../../../admin/AdminIcon";
import { MENU_DESIGNS, MENU_LAYOUTS, RESTAURANT_THEMES, getMenuDesign, isAuroraTheme } from "../../../../lib/themes";
import { ResultNote } from "../../SystemUi";
import {
  deleteRestaurant,
  setRestaurantActive,
  setRestaurantMenuLayout,
  setRestaurantPlan,
  setRestaurantTheme,
} from "../actions";

type Plan = { id: string; name: string; monthly_price: number };

type CurrentSubscription = {
  id: string;
  plan_id: string;
  status: string;
  billing_interval: string;
} | null;

/* =========================================================
   TÜR · PAKET · TEMA
   ========================================================= */

export function RestaurantSettings({
  restaurantId,
  menuOnly,
  theme,
  menuLayout,
  plans,
  subscription,
}: {
  restaurantId: number;
  menuOnly: boolean;
  theme: string;
  menuLayout: string;
  plans: Plan[];
  subscription: CurrentSubscription;
}) {
  const [planResult, planAction, planPending] = useActionState(setRestaurantPlan, null);
  const [themeResult, themeAction, themePending] = useActionState(setRestaurantTheme, null);

  // Başlangıç paketi "sadece menü"dür; tür pakete göre kendiliğinden değişir.
  const type = menuOnly ? "menu" : "full";
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [layoutResult, layoutAction, layoutPending] = useActionState(setRestaurantMenuLayout, null);
  const [selectedLayout, setSelectedLayout] = useState(menuLayout);

  // Sadece menü restoranları Aurora menüsünü kullanır.
  const themeChoices =
    type === "menu" ? RESTAURANT_THEMES.filter((item) => isAuroraTheme(item.value)) : RESTAURANT_THEMES;

  // Temalar tasarıma göre gruplanır: önce tasarım, altında renk paletleri.
  const themeGroups = [
    ...MENU_DESIGNS.map((design) => ({
      key: design.value,
      title: design.label,
      description: design.description,
      items: themeChoices.filter((item) => getMenuDesign(item.value) === design.value),
    })),
    {
      key: "diger",
      title: "Diğer temalar",
      description: "Eski klasik ve Nova temaları.",
      items: themeChoices.filter((item) => getMenuDesign(item.value) === null),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <section className="adm-card" aria-labelledby="ayar-baslik">
      <div className="adm-card-head">
        <div>
          <h2 id="ayar-baslik">Restoran ayarları</h2>
          <p>Paket, tema ve menü düzeni yalnızca sistem panelinden değişir.</p>
        </div>
      </div>

      {/* ---------- Paket ---------- */}
      <form action={planAction} className="sys-setting">
        <input type="hidden" name="restaurant_id" value={restaurantId} />
        {subscription && (
          <>
            <input type="hidden" name="subscription_id" value={subscription.id} />
            <input type="hidden" name="billing_interval" value={subscription.billing_interval || "monthly"} />
          </>
        )}
        <div className="sys-setting-label">
          <strong>Paket</strong>
          <small>
            {subscription
              ? "Mevcut abonelik bu pakete geçer. Süre ve dönem ayarları Abonelikler sayfasında."
              : "Restoranın aboneliği yok; seçtiğiniz paketle aktif bir abonelik başlar."}{" "}
            Başlangıç paketi sadece menüdür: tek QR, masa ve sipariş yok.
          </small>
        </div>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="paket-sec">Paket</label>
            <select
              id="paket-sec"
              name="plan_id"
              className="adm-select"
              defaultValue={subscription?.plan_id ?? plans[0]?.id ?? ""}
              disabled={plans.length === 0}
            >
              {plans.length === 0 && <option value="">Paket tanımlı değil</option>}
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="paket-durum">Durum</label>
            <select
              id="paket-durum"
              name="status"
              className="adm-select"
              defaultValue={
                subscription?.status === "trial" || subscription?.status === "active"
                  ? subscription.status
                  : "active"
              }
            >
              <option value="active">Aktif</option>
              <option value="trial">Deneme (14 gün)</option>
            </select>
          </div>
        </div>
        <div className="sys-setting-foot">
          <ResultNote result={planResult} />
          <button
            type="submit"
            className="adm-btn adm-btn-primary adm-btn-sm"
            disabled={planPending || plans.length === 0}
          >
            {planPending ? "Uygulanıyor…" : "Paketi uygula"}
          </button>
        </div>
      </form>

      {/* ---------- Tema ---------- */}
      <form action={themeAction} className="sys-setting">
        <input type="hidden" name="restaurant_id" value={restaurantId} />
        <input type="hidden" name="theme" value={selectedTheme} />
        <div className="sys-setting-label">
          <strong>Tema</strong>
          <small>
            {type === "menu"
              ? "Sadece menü restoranları Aurora menüsünü kullanır; renk seçin."
              : "Müşteri sayfalarının tasarımı."}
          </small>
        </div>
        <div className="sys-theme-groups" role="radiogroup" aria-label="Tema">
          {themeGroups.map((group) => (
            <div key={group.key} className="sys-theme-group">
              <div className="sys-theme-group-head">
                <strong>{group.title}</strong>
                <small>{group.description}</small>
              </div>
              <div className="sys-themes">
                {group.items.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selectedTheme === item.value}
                    className={`sys-theme ${selectedTheme === item.value ? "is-on" : ""}`}
                    onClick={() => setSelectedTheme(item.value)}
                    title={item.description}
                  >
                    <span
                      className="sys-theme-swatch"
                      style={{ background: item.surface, color: item.accent }}
                      aria-hidden="true"
                    >
                      Aa
                    </span>
                    <span className="sys-theme-name">
                      {item.label.replace(/^(AURORA|ZEST|LINEN) - /, "")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="sys-setting-foot">
          <ResultNote result={themeResult} />
          <button
            type="submit"
            className="adm-btn adm-btn-primary adm-btn-sm"
            disabled={themePending || selectedTheme === theme}
          >
            {themePending ? "Kaydediliyor…" : "Temayı uygula"}
          </button>
        </div>
      </form>

      {/* ---------- Menü düzeni (yalnızca klasik temalar) ---------- */}
      {type !== "menu" && !isAuroraTheme(theme) && (
        <form action={layoutAction} className="sys-setting">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input type="hidden" name="menu_layout" value={selectedLayout} />
          <div className="sys-setting-label">
            <strong>Menü düzeni</strong>
            <small>Klasik temalardaki müşteri menüsünün yerleşimi. Aurora temaları kendi düzenini kullanır.</small>
          </div>
          <div className="sys-themes" role="radiogroup" aria-label="Menü düzeni">
            {MENU_LAYOUTS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={selectedLayout === item.value}
                className={`sys-theme ${selectedLayout === item.value ? "is-on" : ""}`}
                onClick={() => setSelectedLayout(item.value)}
                title={item.description}
              >
                <span className="sys-theme-name">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="sys-setting-foot">
            <ResultNote result={layoutResult} />
            <button
              type="submit"
              className="adm-btn adm-btn-primary adm-btn-sm"
              disabled={layoutPending || selectedLayout === menuLayout}
            >
              {layoutPending ? "Kaydediliyor…" : "Düzeni uygula"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/* =========================================================
   DURUM · KALICI SİLME
   ========================================================= */

export function DangerZone({
  restaurantId,
  restaurantName,
  isActive,
}: {
  restaurantId: number;
  restaurantName: string;
  isActive: boolean;
}) {
  const [activeResult, activeAction, activePending] = useActionState(setRestaurantActive, null);
  const [deleteResult, deleteAction, deletePending] = useActionState(deleteRestaurant, null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [phrase, setPhrase] = useState("");

  return (
    <section className="adm-card sys-danger" aria-labelledby="durum-baslik">
      <div className="adm-card-head">
        <div>
          <h2 id="durum-baslik">Yayın durumu</h2>
          <p>
            {isActive
              ? "Restoran yayında; müşteriler menüye ulaşabiliyor."
              : "Restoran devre dışı; müşteri sayfaları açılmıyor."}
          </p>
        </div>
        <span className={`adm-badge is-dot ${isActive ? "s-ok" : "s-danger"}`}>
          {isActive ? "Yayında" : "Devre dışı"}
        </span>
      </div>

      <form action={activeAction} className="sys-inline">
        <input type="hidden" name="restaurant_id" value={restaurantId} />
        <input type="hidden" name="active" value={isActive ? "false" : "true"} />
        <button
          type="submit"
          className={`adm-btn adm-btn-block ${isActive ? "" : "adm-btn-ok"}`}
          disabled={activePending}
        >
          <AdminIcon name={isActive ? "eyeOff" : "eye"} size={15} />
          {activePending
            ? "Kaydediliyor…"
            : isActive
              ? "Devre dışı bırak"
              : "Yeniden yayına al"}
        </button>
      </form>
      <ResultNote result={activeResult} />

      <div className="adm-divider" />

      {!confirmDelete ? (
        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-text-danger adm-btn-block"
          onClick={() => setConfirmDelete(true)}
        >
          <AdminIcon name="trash" size={15} />
          Restoranı kalıcı olarak sil
        </button>
      ) : (
        <form action={deleteAction} className="sys-delete">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <p>
            <strong>{restaurantName}</strong> ve bağlı tüm menü, ürün, masa, sipariş, yorum ve
            abonelik kayıtları silinir. Bu işlem geri alınamaz.
          </p>
          <label className="adm-label" htmlFor="silme-onay">
            Onaylamak için <b>RESTORANI SIL</b> yazın
          </label>
          <input
            id="silme-onay"
            name="confirm"
            className="adm-input"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            autoComplete="off"
          />
          <div className="sys-inline">
            <button
              type="button"
              className="adm-btn"
              onClick={() => {
                setConfirmDelete(false);
                setPhrase("");
              }}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn-danger"
              disabled={deletePending || phrase.trim() !== "RESTORANI SIL"}
            >
              {deletePending ? "Siliniyor…" : "Kalıcı olarak sil"}
            </button>
          </div>
          <ResultNote result={deleteResult} />
        </form>
      )}
    </section>
  );
}
