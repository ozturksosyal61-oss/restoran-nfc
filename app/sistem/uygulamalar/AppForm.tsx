"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminIcon from "../../admin/AdminIcon";
import { ResultNote } from "../SystemUi";
import { toWebp } from "../../../lib/app-image";
import { APP_STATUSES, appImageUrl, isHexColor, isHttpUrl, slugify, type AppEntry, type AppStatus } from "../../../lib/apps";
import { saveApp, uploadAppImage, type AppResult } from "./actions";

const MAX_SCREENS = 8;
const URL_FIELDS = [
  { key: "app_store_url", label: "App Store bağlantısı" },
  { key: "play_store_url", label: "Google Play bağlantısı" },
  { key: "privacy_url", label: "Gizlilik politikası" },
  { key: "support_url", label: "Destek sayfası" },
] as const;

export default function AppForm({ app }: { app: AppEntry | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AppResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!app);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const screenInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(app?.name ?? "");
  const [slug, setSlug] = useState(app?.slug ?? "");
  const [tagline, setTagline] = useState(app?.tagline ?? "");
  const [description, setDescription] = useState(app?.description ?? "");
  const [status, setStatus] = useState<AppStatus>(app?.status ?? "gizli");
  const [color, setColor] = useState(app?.accent_color ?? "#d9b866");
  const [icon, setIcon] = useState<string | null>(app?.icon_path ?? null);
  const [screens, setScreens] = useState<string[]>(app?.screenshots ?? []);
  const [urls, setUrls] = useState({
    app_store_url: app?.app_store_url ?? "",
    play_store_url: app?.play_store_url ?? "",
    privacy_url: app?.privacy_url ?? "",
    support_url: app?.support_url ?? "",
  });

  const badUrl = (key: keyof typeof urls) => !!urls[key].trim() && !isHttpUrl(urls[key].trim());

  async function upload(file: File, kind: "icon" | "screen") {
    const webp = await toWebp(file, kind);
    const form = new FormData();
    form.set("slug", slug);
    form.set("kind", kind);
    form.set("file", webp);
    const response = await uploadAppImage(form);
    if (!response.ok || !response.path) throw new Error(response.message);
    return response.path;
  }

  async function pickFiles(files: FileList | null, kind: "icon" | "screen") {
    if (!files?.length) return;
    if (!slug) return setResult({ ok: false, message: "Görsel yüklemek için önce ad / slug girin." });
    setUploading(true);
    setResult(null);
    try {
      if (kind === "icon") {
        setIcon(await upload(files[0], "icon"));
      } else {
        const room = MAX_SCREENS - screens.length;
        const added: string[] = [];
        for (const file of Array.from(files).slice(0, room)) added.push(await upload(file, "screen"));
        setScreens((current) => [...current, ...added]);
      }
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Yüklenemedi." });
    } finally {
      setUploading(false);
    }
  }

  function moveScreen(from: number, to: number) {
    if (to < 0 || to >= screens.length || from === to) return;
    setScreens((current) => {
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isHexColor(color)) return setResult({ ok: false, message: "Renk geçersiz." });
    if (URL_FIELDS.some((field) => badUrl(field.key))) return setResult({ ok: false, message: "Bağlantılar https:// ile başlamalı." });
    startTransition(async () => {
      const response = await saveApp({
        id: app?.id ?? null,
        slug,
        name,
        tagline,
        description,
        icon_path: icon,
        screenshots: screens,
        status,
        accent_color: color,
        ...urls,
      });
      setResult(response);
      if (response.ok) {
        router.push("/sistem/uygulamalar");
        router.refresh();
      }
    });
  }

  return (
    <form className="adm-card adm-form" onSubmit={submit}>
      <div className="adm-form-grid">
        <label className="adm-field">
          <span className="adm-label">Ad</span>
          <input
            className="adm-input"
            value={name}
            maxLength={80}
            required
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
          />
        </label>
        <label className="adm-field">
          <span className="adm-label">Slug <em>(görsel klasörü)</em></span>
          <input
            className="adm-input"
            value={slug}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
          />
        </label>
        <label className="adm-field adm-field-full">
          <span className="adm-label">Slogan</span>
          <input className="adm-input" value={tagline} maxLength={120} onChange={(event) => setTagline(event.target.value)} />
        </label>
        <label className="adm-field adm-field-full">
          <span className="adm-label">Açıklama</span>
          <textarea className="adm-textarea" value={description} maxLength={600} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="adm-field">
          <span className="adm-label">Durum</span>
          <select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value as AppStatus)}>
            {APP_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <span className="adm-hint">Gizli: sitede görünmez. Çok yakında: mağaza düğmesi gösterilmez.</span>
        </label>
        <div className="adm-field">
          <span className="adm-label">Ana renk</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="color"
              aria-label="Renk seç"
              value={isHexColor(color) ? color : "#d9b866"}
              onChange={(event) => setColor(event.target.value)}
              style={{ width: 52, height: 42, padding: 2, border: "1px solid var(--a-line-strong)", borderRadius: 10, background: "none" }}
            />
            <input className="adm-input" value={color} maxLength={7} onChange={(event) => setColor(event.target.value)} />
          </div>
        </div>
        {URL_FIELDS.map((field) => (
          <label key={field.key} className="adm-field">
            <span className="adm-label">{field.label} <em>(boşsa gösterilmez)</em></span>
            <input
              className="adm-input"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={urls[field.key]}
              aria-invalid={badUrl(field.key)}
              onChange={(event) => setUrls({ ...urls, [field.key]: event.target.value })}
            />
            {badUrl(field.key) && <span className="adm-hint" style={{ color: "#b42318" }}>Geçerli bir https:// adresi girin.</span>}
          </label>
        ))}
      </div>

      <div className="adm-field">
        <span className="adm-label">Simge <em>(kare, 512 px WebP&apos;ye çevrilir)</em></span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", background: color, display: "grid", placeItems: "center", color: "#fff", fontSize: 28, fontWeight: 700 }}>
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appImageUrl(icon)} alt="Simge önizleme" width={80} height={80} style={{ objectFit: "cover" }} />
            ) : (
              name[0] || "?"
            )}
          </span>
          <input ref={iconInput} type="file" accept="image/*" hidden onChange={(event) => { void pickFiles(event.target.files, "icon"); event.target.value = ""; }} />
          <button type="button" className="adm-btn adm-btn-sm" disabled={uploading} onClick={() => iconInput.current?.click()}>
            <AdminIcon name="image" size={14} />
            {icon ? "Değiştir" : "Yükle"}
          </button>
          {icon && (
            <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost adm-text-danger" onClick={() => setIcon(null)}>
              Kaldır
            </button>
          )}
        </div>
      </div>

      <div className="adm-field">
        <span className="adm-label">Ekran görüntüleri <em>({screens.length}/{MAX_SCREENS} · sürükleyerek ya da okla sırala · 1170 px genişlik)</em></span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {screens.map((path, index) => (
            <div
              key={path}
              draggable
              onDragStart={() => setDragFrom(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null) moveScreen(dragFrom, index);
                setDragFrom(null);
              }}
              style={{ width: 104, display: "grid", gap: 4, cursor: "grab", opacity: dragFrom === index ? 0.4 : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={appImageUrl(path)} alt={`Ekran ${index + 1}`} style={{ width: 104, aspectRatio: "9 / 19", objectFit: "cover", borderRadius: 10, border: "1px solid var(--a-line-strong)" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" aria-label="Sola taşı" disabled={index === 0} onClick={() => moveScreen(index, index - 1)}>
                  <AdminIcon name="arrowLeft" size={13} />
                </button>
                <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost adm-text-danger" aria-label="Sil" onClick={() => setScreens(screens.filter((_, i) => i !== index))}>
                  <AdminIcon name="trash" size={13} />
                </button>
                <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" aria-label="Sağa taşı" disabled={index === screens.length - 1} onClick={() => moveScreen(index, index + 1)}>
                  <AdminIcon name="arrowRight" size={13} />
                </button>
              </div>
            </div>
          ))}
          {screens.length < MAX_SCREENS && (
            <>
              <input ref={screenInput} type="file" accept="image/*" multiple hidden onChange={(event) => { void pickFiles(event.target.files, "screen"); event.target.value = ""; }} />
              <button
                type="button"
                disabled={uploading}
                onClick={() => screenInput.current?.click()}
                style={{ width: 104, aspectRatio: "9 / 19", borderRadius: 10, border: "1.5px dashed var(--a-line-strong)", background: "none", color: "inherit", display: "grid", placeItems: "center", cursor: "pointer" }}
              >
                <AdminIcon name="plus" size={20} />
              </button>
            </>
          )}
        </div>
        {uploading && <span className="adm-hint">Yükleniyor…</span>}
      </div>

      <ResultNote result={result} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending || uploading}>
          <AdminIcon name="save" size={16} />
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <Link href="/sistem/uygulamalar" className="adm-btn adm-btn-ghost">Vazgeç</Link>
      </div>
    </form>
  );
}
