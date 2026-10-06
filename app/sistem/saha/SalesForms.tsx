"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import AdminIcon from "../../admin/AdminIcon";
import { ResultNote } from "../SystemUi";
import { compressImage } from "../../../lib/image-compress";
import {
  BUSINESS_TYPES,
  CHANNELS,
  CURRENT_MENUS,
  INTERESTS,
  LOST_REASONS,
  OFFER_PLANS,
  STAGES,
  stageOf,
  type Lead,
} from "../../../lib/sales";
import {
  addVisit,
  createLead,
  findDuplicates,
  saveLocation,
  setFollowUp,
  setStage,
  updateLead,
  updateOffer,
  uploadPhoto,
  type DuplicateLead,
} from "./actions";

/* ---------------- Yardımcılar ---------------- */

// İstanbul saatine göre datetime-local değeri ("2026-10-07T10:00").
function istanbulLocal(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function daysLater(days: number, hour = 11) {
  const date = new Date(Date.now() + days * 86_400_000);
  const local = istanbulLocal(date).slice(0, 10);
  return `${local}T${String(hour).padStart(2, "0")}:00`;
}

const QUICK_FOLLOW_UPS = [
  { label: "Yarın", value: () => daysLater(1) },
  { label: "3 gün sonra", value: () => daysLater(3) },
  { label: "1 hafta sonra", value: () => daysLater(7) },
  { label: "2 hafta sonra", value: () => daysLater(14) },
];

function Segment({
  name,
  options,
  defaultValue,
  label,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string | null;
  label: string;
}) {
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      <div className="saha-seg" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label key={option.value}>
            <input type="radio" name={name} value={option.value} defaultChecked={defaultValue === option.value} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FollowUpFields({ idPrefix }: { idPrefix: string }) {
  const [value, setValue] = useState("");
  return (
    <>
      <div className="adm-field">
        <label className="adm-label" htmlFor={`${idPrefix}-takip`}>
          Tekrar uğra / ara <em>· isteğe bağlı</em>
        </label>
        <input
          id={`${idPrefix}-takip`}
          name="follow_up_at"
          type="datetime-local"
          className="adm-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="saha-quick">
          {QUICK_FOLLOW_UPS.map((item) => (
            <button key={item.label} type="button" className="adm-chip" onClick={() => setValue(item.value())}>
              {item.label}
            </button>
          ))}
          {value && (
            <button type="button" className="adm-chip" onClick={() => setValue("")}>
              Temizle
            </button>
          )}
        </div>
      </div>
      <div className="adm-field">
        <label className="adm-label" htmlFor={`${idPrefix}-adim`}>
          Sonraki adım <em>· isteğe bağlı</em>
        </label>
        <input
          id={`${idPrefix}-adim`}
          name="next_step"
          className="adm-input"
          maxLength={200}
          placeholder="Örn. Sahibi cumartesi orada olacak, fiyat teklifini götür"
        />
      </div>
    </>
  );
}

function useLocation() {
  const [state, setState] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState("");

  function request(onDone?: (lat: number, lng: number) => void) {
    if (!("geolocation" in navigator)) {
      setStatus("Bu cihaz konum vermiyor.");
      return;
    }
    setStatus("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setState({ lat, lng });
        setStatus(`Konum alındı (±${Math.round(position.coords.accuracy)} m).`);
        onDone?.(lat, lng);
      },
      (error) => {
        setStatus(
          error.code === error.PERMISSION_DENIED
            ? "Konum izni verilmedi. Tarayıcı ayarlarından bu siteye konum izni verin."
            : "Konum alınamadı. Açık alanda tekrar deneyin."
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  }

  return { location: state, status, request };
}

/* ---------------- İşletme formu (yeni / düzenle) ---------------- */

export function LeadForm({ lead }: { lead?: Lead }) {
  const editing = Boolean(lead);
  const [result, action, pending] = useActionState(editing ? updateLead : createLead, null);
  const [dupes, setDupes] = useState<DuplicateLead[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const { location, status, request } = useLocation();

  async function checkDuplicates() {
    const name = nameRef.current?.value ?? "";
    const phone = phoneRef.current?.value ?? "";
    try {
      setDupes(await findDuplicates(name, phone, lead?.id));
    } catch {
      setDupes([]);
    }
  }

  return (
    <form action={action} className="adm-form">
      {lead && <input type="hidden" name="id" value={lead.id} />}

      <div className="adm-form-grid">
        <div className="adm-field adm-field-full">
          <label className="adm-label" htmlFor="aday-ad">İşletmenin adı</label>
          <input
            id="aday-ad"
            ref={nameRef}
            name="name"
            className="adm-input"
            required
            maxLength={120}
            defaultValue={lead?.name}
            placeholder="Örn. Köşe Kahvesi"
            onBlur={checkDuplicates}
            autoComplete="off"
          />
        </div>

        {dupes.length > 0 && (
          <div className="saha-dupes adm-field-full" role="status">
            <strong>Bu işletme zaten kayıtlı olabilir:</strong>
            {dupes.map((dupe) => (
              <Link key={dupe.id} href={`/sistem/saha/${dupe.id}`}>
                {dupe.name}
                {dupe.district ? ` · ${dupe.district}` : ""} · {stageOf(dupe.stage).label}
              </Link>
            ))}
          </div>
        )}

        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-tur">Türü</label>
          <select id="aday-tur" name="business_type" className="adm-select" defaultValue={lead?.business_type ?? "kafe"}>
            {BUSINESS_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-semt">Semt</label>
          <input id="aday-semt" name="district" className="adm-input" maxLength={80} defaultValue={lead?.district ?? ""} placeholder="Örn. Kadıköy" />
        </div>
        <div className="adm-field adm-field-full">
          <label className="adm-label" htmlFor="aday-adres">Adres <em>· isteğe bağlı</em></label>
          <input id="aday-adres" name="address" className="adm-input" maxLength={240} defaultValue={lead?.address ?? ""} placeholder="Cadde, sokak, no" />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-yetkili">Görüşülen kişi</label>
          <input id="aday-yetkili" name="contact_name" className="adm-input" maxLength={80} defaultValue={lead?.contact_name ?? ""} placeholder="Ad soyad" autoComplete="off" />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-gorev">Görevi</label>
          <input id="aday-gorev" name="contact_role" className="adm-input" maxLength={60} defaultValue={lead?.contact_role ?? ""} placeholder="Örn. İşletme müdürü, sahibi" />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-telefon">Telefon</label>
          <input
            id="aday-telefon"
            ref={phoneRef}
            name="phone"
            type="tel"
            inputMode="tel"
            className="adm-input"
            maxLength={30}
            defaultValue={lead?.phone ?? ""}
            placeholder="05xx xxx xx xx"
            onBlur={checkDuplicates}
            autoComplete="off"
          />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-instagram">Instagram</label>
          <input id="aday-instagram" name="instagram" className="adm-input" maxLength={120} defaultValue={lead?.instagram ?? ""} placeholder="@kosekahvesi" autoComplete="off" />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-masa">Masa sayısı</label>
          <input id="aday-masa" name="table_count" type="number" inputMode="numeric" min={0} max={1000} className="adm-input" defaultValue={lead?.table_count ?? ""} />
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-menu">Şu an menü</label>
          <select id="aday-menu" name="current_menu" className="adm-select" defaultValue={lead?.current_menu ?? "bilinmiyor"}>
            {CURRENT_MENUS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="aday-rakip">Rakip / kullandığı sistem <em>· varsa</em></label>
          <input id="aday-rakip" name="competitor" className="adm-input" maxLength={80} defaultValue={lead?.competitor ?? ""} />
        </div>
        <div className="adm-field adm-field-full">
          <label className="adm-label" htmlFor="aday-not">Genel not <em>· isteğe bağlı</em></label>
          <textarea id="aday-not" name="note" className="adm-input" rows={2} maxLength={1000} defaultValue={lead?.note ?? ""} placeholder="İşletmeyle ilgili kalıcı bilgiler" />
        </div>
      </div>

      {!editing && (
        <>
          <div className="adm-field">
            <span className="adm-label">Konum</span>
            <div className="saha-actions">
              <button type="button" className="adm-btn" onClick={() => request()}>
                <AdminIcon name="pin" size={16} />
                {location ? "Konumu yenile" : "Konumumu ekle"}
              </button>
            </div>
            {status && <span className="adm-hint">{status}</span>}
            <input type="hidden" name="latitude" value={location?.lat ?? ""} />
            <input type="hidden" name="longitude" value={location?.lng ?? ""} />
          </div>

          <div className="adm-divider" />
          <div className="adm-card-head" style={{ padding: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>İlk görüşme</h2>
              <p>Şimdi görüştüyseniz not alın; boş bırakırsanız işletme “Yeni” olarak kaydedilir.</p>
            </div>
          </div>
          <Segment name="channel" label="Nasıl görüşüldü?" options={CHANNELS.filter((item) => item.value !== "sistem")} defaultValue="yuz_yuze" />
          <Segment name="interest" label="İlgi" options={INTERESTS} />
          <div className="adm-field">
            <label className="adm-label" htmlFor="aday-gorusme">Görüşme notu</label>
            <textarea id="aday-gorusme" name="first_note" className="adm-input" rows={4} maxLength={2000} placeholder="Ne konuşuldu, itirazlar, ilgilendiği özellikler…" />
          </div>
          <FollowUpFields idPrefix="aday" />
        </>
      )}

      <ResultNote result={result} />

      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg" disabled={pending}>
          <AdminIcon name={editing ? "save" : "plus"} size={17} />
          {pending ? "Kaydediliyor…" : editing ? "Bilgileri kaydet" : "İşletmeyi kaydet"}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Görüşme ekle ---------------- */

export function VisitForm({ leadId }: { leadId: number }) {
  const [result, action, pending] = useActionState(addVisit, null);
  const [formKey, setFormKey] = useState(0);
  const [seenResult, setSeenResult] = useState(result);

  // Kayıt başarılı olunca form boşaltılır (yeni sonuç geldiğinde bir kez).
  if (result !== seenResult) {
    setSeenResult(result);
    if (result?.ok) setFormKey((key) => key + 1);
  }

  return (
    <form key={formKey} action={action} className="adm-form">
      <input type="hidden" name="lead_id" value={leadId} />
      <Segment name="channel" label="Nasıl görüşüldü?" options={CHANNELS.filter((item) => item.value !== "sistem")} defaultValue="yuz_yuze" />
      <Segment name="interest" label="İlgi" options={INTERESTS} />
      <div className="adm-field">
        <label className="adm-label" htmlFor="gorusme-not">Not</label>
        <textarea id="gorusme-not" name="note" className="adm-input" rows={4} maxLength={2000} required placeholder="Ne konuşuldu?" />
      </div>
      <FollowUpFields idPrefix="gorusme" />
      <ResultNote result={result} />
      <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg adm-btn-block" disabled={pending}>
        <AdminIcon name="plus" size={17} />
        {pending ? "Kaydediliyor…" : "Görüşmeyi kaydet"}
      </button>
    </form>
  );
}

/* ---------------- Takip tarihi ---------------- */

export function FollowUpForm({ leadId }: { leadId: number }) {
  const [result, action, pending] = useActionState(setFollowUp, null);
  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="id" value={leadId} />
      <FollowUpFields idPrefix="takip" />
      <ResultNote result={result} />
      <button type="submit" className="adm-btn" disabled={pending}>
        <AdminIcon name="calendar" size={16} />
        {pending ? "Kaydediliyor…" : "Takip tarihi koy"}
      </button>
    </form>
  );
}

/* ---------------- Aşama ---------------- */

export function StageForm({ lead }: { lead: Lead }) {
  const [result, action, pending] = useActionState(setStage, null);
  const [stage, setStageValue] = useState<string>(lead.stage);

  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="id" value={lead.id} />
      <div className="saha-seg" role="radiogroup" aria-label="Aşama">
        {STAGES.map((item) => (
          <label key={item.value}>
            <input
              type="radio"
              name="stage"
              value={item.value}
              checked={stage === item.value}
              onChange={() => setStageValue(item.value)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      {stage === "kaybedildi" && (
        <div className="adm-field">
          <label className="adm-label" htmlFor="kayip-neden">Neden kaybedildi?</label>
          <select id="kayip-neden" name="lost_reason" className="adm-select" defaultValue={lead.lost_reason ?? ""} required>
            <option value="" disabled>
              Seçin
            </option>
            {LOST_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <ResultNote result={result} />
      <button type="submit" className="adm-btn" disabled={pending || (stage === lead.stage && stage !== "kaybedildi")}>
        <AdminIcon name="check" size={16} />
        {pending ? "Kaydediliyor…" : "Aşamayı kaydet"}
      </button>
    </form>
  );
}

/* ---------------- Teklif ---------------- */

export function OfferForm({ lead }: { lead: Lead }) {
  const [result, action, pending] = useActionState(updateOffer, null);
  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="id" value={lead.id} />
      <div className="adm-form-grid">
        <div className="adm-field">
          <label className="adm-label" htmlFor="teklif-paket">Önerilen paket</label>
          <select id="teklif-paket" name="offer_plan" className="adm-select" defaultValue={lead.offer_plan ?? ""}>
            <option value="">Seçilmedi</option>
            {OFFER_PLANS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-label" htmlFor="teklif-fiyat">Konuşulan fiyat (₺)</label>
          <input
            id="teklif-fiyat"
            name="offer_price"
            className="adm-input"
            inputMode="decimal"
            defaultValue={lead.offer_price ?? ""}
            placeholder="Örn. 1490"
          />
        </div>
        <div className="adm-field adm-field-full">
          <label className="adm-label" htmlFor="teklif-not">Teklif notu</label>
          <input
            id="teklif-not"
            name="offer_note"
            className="adm-input"
            maxLength={500}
            defaultValue={lead.offer_note ?? ""}
            placeholder="Örn. Yıllık ödemede 2 ay hediye, 10 NFC kart dahil"
          />
        </div>
      </div>
      <ResultNote result={result} />
      <button type="submit" className="adm-btn" disabled={pending}>
        <AdminIcon name="save" size={16} />
        {pending ? "Kaydediliyor…" : "Teklifi kaydet"}
      </button>
    </form>
  );
}

/* ---------------- Konum ---------------- */

export function LocationButton({ leadId, hasLocation }: { leadId: number; hasLocation: boolean }) {
  const [result, action, pending] = useActionState(saveLocation, null);
  const { status, request } = useLocation();

  function save() {
    request((lat, lng) => {
      const form = new FormData();
      form.set("id", String(leadId));
      form.set("latitude", String(lat));
      form.set("longitude", String(lng));
      startTransition(() => action(form));
    });
  }

  return (
    <div className="adm-field">
      <button type="button" className="adm-btn" onClick={save} disabled={pending}>
        <AdminIcon name="pin" size={16} />
        {hasLocation ? "Konumu buradan güncelle" : "Konumumu ekle"}
      </button>
      {status && !result && <span className="adm-hint">{status}</span>}
      <ResultNote result={result} />
    </div>
  );
}

/* ---------------- Fotoğraf ---------------- */

export function PhotoUploader({ leadId }: { leadId: number }) {
  const [result, action, pending] = useActionState(uploadPhoto, null);
  const [preparing, setPreparing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setPreparing(true);
    const prepared = (await compressImage(file, { maxSize: 1600, quality: 0.82 })).file;
    setPreparing(false);
    const form = new FormData();
    form.set("id", String(leadId));
    form.set("photo", prepared);
    startTransition(() => action(form));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="adm-field">
      <label className="adm-btn" style={{ cursor: "pointer", justifySelf: "start" }}>
        <AdminIcon name="image" size={16} />
        {preparing ? "Hazırlanıyor…" : pending ? "Yükleniyor…" : "Fotoğraf ekle"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          hidden
          onChange={handleChange}
          disabled={pending || preparing}
        />
      </label>
      <ResultNote result={result} />
    </div>
  );
}

/* ---------------- Onaylı silme düğmesi ---------------- */

export function ConfirmButton({
  message,
  children,
  className = "adm-btn adm-btn-sm adm-btn-ghost adm-text-danger",
  label,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={label}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
