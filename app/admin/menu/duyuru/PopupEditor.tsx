"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon from "../../AdminIcon";
import MenuPopup from "../../../restoran/[slug]/MenuPopup";
import { createClient } from "../../../../lib/supabase/client";
import { compressImage } from "../../../../lib/image-compress";
import { POPUP_LIMITS, type MenuPopup as Popup, type PopupFrequency, type PopupLinkType } from "../../../../lib/menu-popup";
import { savePopup } from "./actions";

const LINK_TYPES: { value: PopupLinkType; label: string; hint: string }[] = [
  { value: "none", label: "Düğme yok", hint: "Yalnızca duyuru" },
  { value: "category", label: "Menü kategorisi", hint: "Ör. Tatlılar'a götürür" },
  { value: "instagram", label: "Instagram", hint: "Kayıtlı Instagram adresiniz" },
  { value: "url", label: "Web adresi", hint: "Rezervasyon, site, kampanya" },
];

const FREQUENCIES: { value: PopupFrequency; label: string }[] = [
  { value: "every", label: "Her açılışta" },
  { value: "daily", label: "Günde bir kez" },
  { value: "once", label: "Yalnızca bir kez" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
      <AdminIcon name="save" size={16} />
      {pending ? "Kaydediliyor…" : "Kaydet"}
    </button>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className="adm-hint" style={{ justifySelf: "end" }}>
      {value.length}/{max}
    </span>
  );
}

export default function PopupEditor({
  restaurantId,
  initial,
  categories,
  instagramUrl,
}: {
  restaurantId: number;
  initial: Popup;
  categories: { id: number; name: string }[];
  instagramUrl: string | null;
}) {
  const [result, action] = useActionState(savePopup, null);
  const [popup, setPopup] = useState<Popup>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const set = <K extends keyof Popup>(key: K, value: Popup[K]) => setPopup((current) => ({ ...current, [key]: value }));

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Lütfen bir görsel seçin.");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSize: 1200 });
      const path = `${restaurantId}/popup-${Date.now()}.${compressed.extension}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("restaurant-assets")
        .upload(path, compressed.file, { cacheControl: "31536000", contentType: compressed.file.type, upsert: false });
      if (error) throw error;
      set("imageUrl", supabase.storage.from("restaurant-assets").getPublicUrl(path).data.publicUrl);
    } catch (error) {
      setUploadError(`Görsel yüklenemedi: ${(error as { message?: string })?.message ?? "bilinmeyen hata"}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="adm-popup-layout">
      <form action={action} className="adm-card adm-form">
        <input type="hidden" name="enabled" value={popup.enabled ? "1" : "0"} />
        <input type="hidden" name="imageUrl" value={popup.imageUrl ?? ""} />
        <input type="hidden" name="linkType" value={popup.linkType} />
        <input type="hidden" name="frequency" value={popup.frequency} />

        <label className="adm-switch-row">
          <span>
            <strong>Duyuruyu göster</strong>
            <small className="adm-hint">Açıkken müşteri menüyü açtığında bu pencere çıkar.</small>
          </span>
          <input
            type="checkbox"
            className="adm-switch"
            checked={popup.enabled}
            onChange={(event) => set("enabled", event.target.checked)}
          />
        </label>

        <div className="adm-field">
          <label className="adm-label" htmlFor="duyuru-baslik">Başlık</label>
          <input
            id="duyuru-baslik"
            name="title"
            className="adm-input"
            maxLength={POPUP_LIMITS.title}
            value={popup.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Tatlılarda %50 indirim"
          />
          <Counter value={popup.title} max={POPUP_LIMITS.title} />
        </div>

        <div className="adm-field">
          <label className="adm-label" htmlFor="duyuru-metin">Metin</label>
          <textarea
            id="duyuru-metin"
            name="text"
            className="adm-textarea"
            rows={3}
            maxLength={POPUP_LIMITS.text}
            value={popup.text}
            onChange={(event) => set("text", event.target.value)}
            placeholder="Bu hafta sonuna kadar tüm tatlılar yarı fiyatına."
          />
          <Counter value={popup.text} max={POPUP_LIMITS.text} />
        </div>

        <div className="adm-field">
          <span className="adm-label">
            Görsel <em>· isteğe bağlı</em>
          </span>
          <div className="adm-head-actions" style={{ justifyContent: "flex-start" }}>
            <label className="adm-btn adm-btn-sm">
              <AdminIcon name="image" size={14} />
              {uploading ? "Yükleniyor…" : popup.imageUrl ? "Görseli değiştir" : "Görsel seç"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={uploading}
                onChange={(event) => void uploadImage(event.target.files?.[0])}
              />
            </label>
            {popup.imageUrl && (
              <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => set("imageUrl", null)}>
                Görseli kaldır
              </button>
            )}
          </div>
          {uploadError && <span className="adm-text-danger adm-hint">{uploadError}</span>}
        </div>

        <div className="adm-field">
          <span className="adm-label">Düğme nereye götürsün?</span>
          <div className="adm-role-grid">
            {LINK_TYPES.map((item) => (
              <label key={item.value} className={`adm-role ${popup.linkType === item.value ? "is-active" : ""}`}>
                <input
                  type="radio"
                  name="linkTypeChoice"
                  checked={popup.linkType === item.value}
                  onChange={() => set("linkType", item.value)}
                />
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </label>
            ))}
          </div>
        </div>

        {popup.linkType !== "none" && (
          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label" htmlFor="duyuru-dugme">Düğme yazısı</label>
              <input
                id="duyuru-dugme"
                name="buttonLabel"
                className="adm-input"
                maxLength={POPUP_LIMITS.button}
                value={popup.buttonLabel}
                onChange={(event) => set("buttonLabel", event.target.value)}
                placeholder={popup.linkType === "instagram" ? "Bizi takip edin" : "Tatlılara göz at"}
              />
            </div>

            {popup.linkType === "category" && (
              <div className="adm-field">
                <label className="adm-label" htmlFor="duyuru-kategori">Kategori</label>
                <select
                  id="duyuru-kategori"
                  name="categoryId"
                  className="adm-select"
                  value={popup.categoryId ?? ""}
                  onChange={(event) => set("categoryId", event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">Seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {popup.linkType === "url" && (
              <div className="adm-field">
                <label className="adm-label" htmlFor="duyuru-adres">Web adresi</label>
                <input
                  id="duyuru-adres"
                  name="url"
                  className="adm-input"
                  type="url"
                  inputMode="url"
                  maxLength={POPUP_LIMITS.url}
                  value={popup.url ?? ""}
                  onChange={(event) => set("url", event.target.value)}
                  placeholder="https://"
                />
              </div>
            )}

            {popup.linkType === "instagram" && (
              <p className="adm-hint" style={{ margin: 0, alignSelf: "end" }}>
                {instagramUrl ? `Adres: ${instagramUrl}` : "Instagram adresiniz kayıtlı değil; İşletme ayarlarından ekleyin."}
              </p>
            )}
          </div>
        )}
        {popup.linkType !== "url" && <input type="hidden" name="url" value={popup.url ?? ""} />}
        {popup.linkType !== "category" && <input type="hidden" name="categoryId" value={popup.categoryId ?? ""} />}
        {popup.linkType === "none" && <input type="hidden" name="buttonLabel" value="" />}

        <div className="adm-field">
          <span className="adm-label">Ne sıklıkla gösterilsin?</span>
          <div className="adm-seg" role="radiogroup" aria-label="Gösterim sıklığı">
            {FREQUENCIES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={popup.frequency === item.value}
                className={popup.frequency === item.value ? "is-active" : ""}
                onClick={() => set("frequency", item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="adm-hint">Aynı müşteriye, aynı telefonda. Duyuruyu değiştirince herkese yeniden gösterilir.</span>
        </div>

        <div className="adm-form-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="duyuru-bas">
              Başlangıç <em>· isteğe bağlı</em>
            </label>
            <input
              id="duyuru-bas"
              name="startsOn"
              type="date"
              className="adm-input"
              value={popup.startsOn ?? ""}
              onChange={(event) => set("startsOn", event.target.value || null)}
            />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="duyuru-bit">
              Bitiş <em>· isteğe bağlı</em>
            </label>
            <input
              id="duyuru-bit"
              name="endsOn"
              type="date"
              className="adm-input"
              value={popup.endsOn ?? ""}
              onChange={(event) => set("endsOn", event.target.value || null)}
            />
          </div>
        </div>

        {result && (
          <p className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`} role={result.ok ? "status" : "alert"} style={{ margin: 0 }}>
            <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
            {result.message}
          </p>
        )}

        <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
          <Submit />
        </div>
      </form>

      <aside className="adm-popup-preview" aria-label="Önizleme">
        <span className="adm-label">Önizleme</span>
        {popup.title || popup.text || popup.imageUrl ? (
          <MenuPopup
            key={JSON.stringify(popup)}
            restaurantId={restaurantId}
            popup={{ ...popup, enabled: true }}
            instagramUrl={instagramUrl}
            preview
          />
        ) : (
          <p className="adm-hint" style={{ margin: 0 }}>Başlık ya da metin yazınca önizleme burada görünür.</p>
        )}
      </aside>
    </div>
  );
}
