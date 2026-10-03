"use client";

import { startTransition, useActionState, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import QRCode from "qrcode";
import AdminIcon from "../../admin/AdminIcon";
import { compressImage } from "../../../lib/image-compress";
import { CredentialsBox, ResultNote } from "../SystemUi";
import { createDemo, type CreatedDemo } from "./actions";

const DURATIONS = [3, 7, 14, 30];
// Sunucu işlemine gönderilebilecek toplam boyut (menü okuyucunun sınırı).
const MAX_TOTAL = 5.4 * 1024 * 1024;

const noopSubscribe = () => () => {};

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DemoReady({ demo, onNew }: { demo: CreatedDemo; onNew: () => void }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const menuUrl = `${origin}/restoran/${demo.slug}?masa=${encodeURIComponent(demo.tableToken)}`;
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(menuUrl, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [menuUrl, origin]);

  const whatsappText =
    `Merhaba, ${demo.name} için hazırladığımız dijital menü demosu:\n${menuUrl}\n\n` +
    "Telefonunuzdan açıp menünüzü, sipariş vermeyi ve garson çağırmayı deneyebilirsiniz.";

  return (
    <section className="adm-card" aria-labelledby="demo-hazir">
      <div className="adm-card-head">
        <div>
          <h2 id="demo-hazir">{demo.name} demosu hazır</h2>
          <p>
            {demo.categoryCount} kategori, {demo.productCount} ürün aktarıldı · {formatDate(demo.expiresAt)} tarihine kadar
            açık.
          </p>
        </div>
      </div>

      {demo.missingPrices > 0 && (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          {demo.missingPrices} ürünün fiyatı okunamadı ve 0 ₺ yazıldı. Görüşmeden önce demo panelinden düzeltebilirsiniz.
        </p>
      )}

      <div className="sys-demo-ready">
        <div className="sys-demo-qr">
          {/* eslint-disable-next-line @next/next/no-img-element -- tarayıcıda üretilen QR görseli */}
          {qr ? <img src={qr} alt={`${demo.name} demo menüsü QR kodu (Masa 1)`} /> : <span className="adm-hint">QR hazırlanıyor…</span>}
          {qr && (
            <a className="adm-btn adm-btn-sm" href={qr} download={`${demo.slug}-masa-1.png`}>
              <AdminIcon name="download" size={14} />
              QR’ı indir
            </a>
          )}
        </div>
        <div className="sys-demo-links">
          <div className="adm-field">
            <span className="adm-label">Müşteri menüsü (Masa 1)</span>
            <a className="sys-link" href={menuUrl} target="_blank" rel="noreferrer">
              {menuUrl}
            </a>
          </div>
          <div className="adm-head-actions" style={{ justifyContent: "flex-start" }}>
            <a className="adm-btn adm-btn-primary" href={menuUrl} target="_blank" rel="noreferrer">
              <AdminIcon name="external" size={16} />
              Menüyü aç
            </a>
            <a
              className="adm-btn"
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
            >
              <AdminIcon name="chat" size={16} />
              WhatsApp’ta gönder
            </a>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={onNew}>
              <AdminIcon name="plus" size={16} />
              Yeni demo
            </button>
          </div>
          <p className="adm-hint" style={{ margin: 0 }}>
            Masada sipariş vermeyi ve garson çağırmayı göstermek için QR’ı telefonla okutun. Siparişler demo panelinde
            görünür.
          </p>
        </div>
      </div>

      {demo.credentials && (
        <CredentialsBox email={demo.credentials.email} password={demo.credentials.password} loginUrl="/admin/login" />
      )}
    </section>
  );
}

export default function DemoCreator({
  themes,
  aiReady,
}: {
  themes: { value: string; label: string }[];
  aiReady: boolean;
}) {
  const [result, action, pending] = useActionState(createDemo, null);
  const [preparing, setPreparing] = useState(false);
  const [clientError, setClientError] = useState("");
  const [hideResult, setHideResult] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const defaultTheme = themes.find((theme) => theme.value === "aurora")?.value ?? themes[0]?.value ?? "classic";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError("");
    setHideResult(false);
    const form = new FormData(event.currentTarget);
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);

    if (files.length === 0) {
      setClientError("Menünün fotoğrafını ya da PDF dosyasını seçin.");
      return;
    }
    if (files.length > 8) {
      setClientError("En fazla 8 dosya seçebilirsiniz.");
      return;
    }

    // Fotoğraflar okunaklı kalacak kadar küçültülür; PDF olduğu gibi gönderilir.
    setPreparing(true);
    form.delete("files");
    let total = 0;
    for (const file of files) {
      const prepared = file.type.startsWith("image/") ? (await compressImage(file, { maxSize: 2000, quality: 0.85 })).file : file;
      total += prepared.size;
      form.append("files", prepared);
    }
    setPreparing(false);

    if (total > MAX_TOTAL) {
      setClientError("Dosyalar toplamda çok büyük (en fazla 5 MB). Daha az sayfa seçin.");
      return;
    }

    startTransition(() => action(form));
  }

  if (result?.ok && result.demo && !hideResult) {
    return (
      <DemoReady
        demo={result.demo}
        onNew={() => {
          setHideResult(true);
          setFormKey((key) => key + 1);
        }}
      />
    );
  }

  const busy = pending || preparing;

  return (
    <section className="adm-card" aria-labelledby="demo-yeni">
      <div className="adm-card-head">
        <div>
          <h2 id="demo-yeni">Yeni demo</h2>
          <p>Yapay zekâ menüyü okur; kategoriler, ürünler ve fiyatlar otomatik oluşur. 3 masa ve QR kodları hazırlanır.</p>
        </div>
      </div>

      {!aiReady && (
        <p className="adm-alert adm-alert-error" style={{ margin: 0 }}>
          <AdminIcon name="alert" size={16} />
          Menü okuma için yapay zekâ anahtarı (GEMINI_API_KEY) tanımlı değil.
        </p>
      )}

      <form key={formKey} className="adm-form" onSubmit={handleSubmit} noValidate>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="demo-ad">İşletmenin adı</label>
            <input id="demo-ad" name="name" className="adm-input" required maxLength={80} placeholder="Köşe Kahvesi" />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="demo-tema">Tema</label>
            <select id="demo-tema" name="theme" className="adm-select" defaultValue={defaultTheme}>
              {themes.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-field adm-field-full">
            <label className="adm-label" htmlFor="demo-dosya">Menü fotoğrafları ya da PDF</label>
            <input
              id="demo-dosya"
              name="files"
              className="adm-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              required
            />
            <span className="adm-hint">En fazla 8 dosya. Menünün tamamı net görünmeli; her sayfa ayrı fotoğraf olabilir.</span>
          </div>
          <div className="adm-field">
            <span className="adm-label">Demo süresi</span>
            <div className="adm-seg" role="radiogroup" aria-label="Demo süresi">
              {DURATIONS.map((days) => (
                <label key={days} className="sys-demo-days">
                  <input type="radio" name="days" value={days} defaultChecked={days === 7} />
                  <span>{days} gün</span>
                </label>
              ))}
            </div>
          </div>
          <div className="adm-field">
            <span className="adm-label">Panel girişi</span>
            <label className="adm-check">
              <input type="checkbox" name="with_login" value="1" defaultChecked />
              <span>İşletme sahibi yönetim panelini de kendi menüsüyle denesin</span>
            </label>
          </div>
          <div className="adm-field adm-field-full">
            <label className="adm-label" htmlFor="demo-not">
              Not <em>· isteğe bağlı</em>
            </label>
            <input id="demo-not" name="note" className="adm-input" maxLength={300} placeholder="Görüşme tarihi, yetkili kişi, telefon…" />
          </div>
        </div>

        <ResultNote result={clientError ? { ok: false, message: clientError } : result && !result.ok ? result : null} />

        <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={busy || !aiReady}>
            <AdminIcon name="sparkle" size={16} />
            {preparing ? "Fotoğraflar hazırlanıyor…" : pending ? "Menü okunuyor, demo kuruluyor… (1 dakika kadar)" : "Demoyu oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}
