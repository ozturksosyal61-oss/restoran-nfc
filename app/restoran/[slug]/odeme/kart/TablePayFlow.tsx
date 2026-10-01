"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuroraIcon from "../../AuroraIcon";
import { formatLira } from "../../aurora-utils";
import flow from "../../AuroraFlow.module.css";
import styles from "../TablePay.module.css";
import { EPS, pendingKey, unitsLabel } from "../pay-utils";
import type { SplitMode, TableItem, TablePaymentInfo } from "../../../../../lib/payments/table";

// Masadan kartla ödeme: tamamını öde, kendi ürünlerini öde ya da eşit böl.
// Tutar burada yalnızca önizlenir; asıl hesap sunucuda yapılır.

const TIP_RATES = [0, 5, 10, 15] as const;
const SHARE_COUNTS = [2, 3, 4, 5, 6];

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function freeUnits(item: TableItem) {
  const free = Number(item.quantity) - Number(item.taken_units);
  return free > EPS ? free : 0;
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <span className={styles.stepper} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Azalt">
        <AuroraIcon name="minus" size={16} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Artır">
        <AuroraIcon name="plus" size={16} />
      </button>
    </span>
  );
}

export default function TablePayFlow({ slug, restaurantName }: { slug: string; restaurantName: string }) {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [info, setInfo] = useState<TablePaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [mode, setMode] = useState<SplitMode>("full");
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [shareOpen, setShareOpen] = useState<number | null>(null);
  const [splitOf, setSplitOf] = useState(2);
  const [parts, setParts] = useState(1);
  const [tipRate, setTipRate] = useState<number | "custom">(0);
  const [customTip, setCustomTip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pendingRef, setPendingRef] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get("masa")?.trim() || "";
    let stored = "";
    let pending: string | null = null;
    try {
      stored = window.localStorage.getItem("ozt_table_token")?.trim() || "";
      pending = window.localStorage.getItem(pendingKey(slug));
    } catch {
      // Tarayıcı depolaması kapalıysa yalnızca adresteki masa kodu kullanılır.
    }
    // localStorage yalnızca tarayıcıda okunabilir; değer açılıştan sonra yazılır.
    /* eslint-disable react-hooks/set-state-in-effect */
    setToken(urlToken || stored);
    setPendingRef(pending);
    setTokenChecked(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, slug]);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const response = await fetch(
          `/api/odeme/masa?slug=${encodeURIComponent(slug)}&masa=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as TablePaymentInfo;
        setInfo(data);
        setLoadError("");
      } catch {
        if (!silent) setLoadError("Hesap bilgisi alınamadı. İnternet bağlantınızı kontrol edin.");
      } finally {
        setLoading(false);
      }
    },
    [slug, token]
  );

  useEffect(() => {
    if (!token) return;
    // İlk yükleme ve 8 saniyede bir yenileme; durum load içinde yönetilir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = window.setInterval(() => void load(true), 8000);
    return () => window.clearInterval(timer);
  }, [load, token]);

  const state = info?.state ?? null;
  const items = useMemo(() => state?.items ?? [], [state]);
  const remaining = Number(state?.remaining ?? 0);
  const split = state?.split ?? null;

  // Başkası öderken seçili ürün kullanılamaz hâle geldiyse seçim düzeltilir.
  const validSelection = useMemo(() => {
    const next: Record<number, number> = {};
    for (const item of items) {
      const units = selection[item.id];
      if (units && units <= freeUnits(item) + EPS) next[item.id] = units;
    }
    return next;
  }, [items, selection]);

  // Eşit bölüşme: masada başlamış bir bölüşme varsa ona uyulur.
  const splitLocked = Boolean(split && split.parts_taken > 0);
  const effectiveOf = splitLocked && split ? split.of : splitOf;
  const partsTaken = split && split.of === effectiveOf ? split.parts_taken : 0;
  const partsLeft = Math.max(effectiveOf - partsTaken, 0);
  const effectiveParts = Math.min(Math.max(parts, 1), Math.max(partsLeft, 1));
  const splitTotal = split && split.of === effectiveOf ? Number(split.total) : remaining;
  const share = round2(splitTotal / effectiveOf);

  const billAmount = useMemo(() => {
    if (mode === "full") return round2(remaining);
    if (mode === "equal") {
      if (partsLeft === 0) return 0;
      const amount = effectiveParts === partsLeft ? remaining : round2((splitTotal / effectiveOf) * effectiveParts);
      return round2(Math.min(amount, remaining));
    }
    const free = items.reduce((sum, item) => sum + freeUnits(item), 0);
    const chosenUnits = Object.values(validSelection).reduce((sum, units) => sum + units, 0);
    if (chosenUnits <= 0) return 0;
    if (free - chosenUnits <= EPS) return round2(remaining);
    const amount = items.reduce(
      (sum, item) => sum + round2((validSelection[item.id] ?? 0) * Number(item.unit_price)),
      0
    );
    return round2(Math.min(amount, remaining));
  }, [mode, remaining, items, validSelection, partsLeft, effectiveParts, splitTotal, effectiveOf]);

  const tip = useMemo(() => {
    if (tipRate === "custom") {
      const value = Number(customTip.replace(",", "."));
      return Number.isFinite(value) && value > 0 ? round2(Math.min(value, billAmount)) : 0;
    }
    return round2((billAmount * tipRate) / 100);
  }, [tipRate, customTip, billAmount]);

  const total = round2(billAmount + tip);
  const canPay = billAmount >= 1 && !submitting;

  function setUnits(item: TableItem, units: number) {
    setSelection((current) => {
      const next = { ...current };
      if (units <= EPS) delete next[item.id];
      else next[item.id] = Math.min(units, freeUnits(item));
      return next;
    });
  }

  async function pay() {
    if (!canPay) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/odeme/masa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          masa: token,
          mode,
          items: Object.entries(validSelection).map(([id, units]) => ({ id: Number(id), units: Math.round(units * 10000) / 10000 })),
          splitOf: effectiveOf,
          parts: effectiveParts,
          tip,
        }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; redirectUrl?: string; reference?: string };
      if (!result.ok || !result.redirectUrl) {
        setSubmitError(result.message || "Ödeme başlatılamadı.");
        setSubmitting(false);
        void load(true);
        return;
      }
      try {
        if (result.reference) window.localStorage.setItem(pendingKey(slug), result.reference);
      } catch {
        // Depolama kapalıysa yarım kalan ödeme hatırlatması gösterilmez.
      }
      window.location.assign(result.redirectUrl);
    } catch {
      setSubmitError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setSubmitting(false);
    }
  }

  async function cancelPending() {
    if (!pendingRef) return;
    await fetch("/api/odeme/masa/iptal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: pendingRef }),
    }).catch(() => null);
    try {
      window.localStorage.removeItem(pendingKey(slug));
    } catch {
      // yok sayılır
    }
    setPendingRef(null);
    void load(true);
  }

  const tableQuery = token ? `?masa=${encodeURIComponent(token)}` : "";
  const billHref = `/restoran/${encodeURIComponent(slug)}/odeme${tableQuery}`;

  const header = (
    <header className={flow.top}>
      <a className={flow.round} href={billHref} aria-label="Masa hesabına dön">
        <AuroraIcon name="back" />
      </a>
      <h1>Kartla öde</h1>
    </header>
  );

  function screen(content: React.ReactNode) {
    return (
      <div className={flow.page}>
        <div className={flow.column}>
          {header}
          {content}
        </div>
      </div>
    );
  }

  function message(icon: "alert" | "receipt" | "check" | "clock" | "card", title: string, text: string, danger = false) {
    return screen(
      <div className={flow.state} role={danger ? "alert" : "status"}>
        <span className={`${flow.stateIcon} ${danger ? flow.stateIconDanger : ""}`}>
          <AuroraIcon name={icon} size={24} />
        </span>
        <strong>{title}</strong>
        <span>{text}</span>
        <a className={flow.ctaInline} href={billHref}>
          Masa hesabına dön
        </a>
      </div>
    );
  }

  if (tokenChecked && !token) {
    return message("alert", "Masa bulunamadı", "Lütfen masanızdaki QR kodu okutun.", true);
  }

  if (loading || !tokenChecked) {
    return screen(
      <div className={flow.state} role="status">
        <span className={flow.spinner} aria-hidden="true" />
        <strong>Hesabınız hazırlanıyor</strong>
      </div>
    );
  }

  if (loadError) return message("alert", "Hesap görüntülenemedi", loadError, true);
  if (!info?.enabled) {
    return message("card", "Online ödeme kapalı", "Bu restoranda kartla ödeme şu anda kullanılamıyor. Ödemenizi garsonunuza yapabilirsiniz.");
  }
  if (!state) return message("alert", "Hesap görüntülenemedi", info.error || "Hesap bilgisi alınamadı.", true);
  if (!state.open || Number(state.due ?? 0) <= 0) {
    return message("check", "Ödenecek hesap yok", "Bu masanın açık hesabı bulunmuyor ya da tamamı ödendi.");
  }

  const pendingOthers = Number(state.pending_total ?? 0);

  return (
    <div className={flow.page}>
      <div className={`${flow.column} ${flow.columnWithFooter}`} style={{ paddingBottom: 220 }}>
        {header}

        {pendingRef && (
          <div className={styles.notice} role="status">
            <AuroraIcon name="clock" size={16} />
            <span>
              Yarım kalmış bir ödemeniz var. Ödemeyi tamamladıysanız sonucunu görebilir, vazgeçtiyseniz iptal edebilirsiniz.
              <span className={styles.noticeActions}>
                <a
                  className={flow.textLink}
                  href={`/restoran/${encodeURIComponent(slug)}/odeme/dekont?ref=${encodeURIComponent(pendingRef)}`}
                >
                  Sonucu gör
                </a>
                <button type="button" className={styles.linkButton} onClick={() => void cancelPending()}>
                  Ödemeyi iptal et
                </button>
              </span>
            </span>
          </div>
        )}

        <section className={flow.due} aria-labelledby="kalan-baslik">
          <span id="kalan-baslik" className={flow.kicker}>
            {restaurantName} · Kalan hesap
          </span>
          <strong className={flow.dueAmount}>{formatLira(remaining)}</strong>
          <div className={flow.dueMeta}>
            <span>
              Masa <b>{state.table_number}</b>
            </span>
            <span>
              Hesap <b>{formatLira(Number(state.open_total ?? 0))}</b>
            </span>
            {Number(state.paid_total ?? 0) > 0 && (
              <span>
                Kartla ödenen <b>{formatLira(Number(state.paid_total))}</b>
              </span>
            )}
            {pendingOthers > 0 && (
              <span>
                Şu an ödeniyor <b>{formatLira(pendingOthers)}</b>
              </span>
            )}
          </div>
        </section>

        {remaining <= 0 ? (
          <p className={styles.notice} role="status">
            <AuroraIcon name="clock" size={16} />
            Kalan hesap şu anda masadaki başka biri tarafından ödeniyor. Birkaç saniye içinde güncellenecek.
          </p>
        ) : (
          <>
            <div className={styles.modes} role="tablist" aria-label="Ödeme şekli">
              {(
                [
                  ["full", "Tamamı", "Kalan hesap"],
                  ["items", "Ürün seç", "Kendi yediğim"],
                  ["equal", "Eşit böl", "Kişi başı"],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  className={`${styles.mode} ${mode === value ? styles.modeOn : ""}`}
                  onClick={() => setMode(value)}
                >
                  {label}
                  <small>{hint}</small>
                </button>
              ))}
            </div>

            {mode === "full" && (
              <section className={flow.block} aria-label="Hesabın tamamı">
                <p className={flow.muted}>
                  Masanın kalan hesabının tamamını siz ödersiniz. Ödeme bitince masa hesabı kapanır.
                </p>
              </section>
            )}

            {mode === "items" && (
              <section className={flow.block} aria-labelledby="urun-sec">
                <div className={flow.blockHead}>
                  <span>
                    <span id="urun-sec" className={flow.kicker}>
                      Ne yediniz?
                    </span>
                  </span>
                </div>
                <ul className={styles.items}>
                  {items.map((item) => {
                    const free = freeUnits(item);
                    const chosen = validSelection[item.id] ?? 0;
                    const whole = Math.floor(free + EPS);
                    const paid = Number(item.paid_units);
                    const fractional = chosen > 0 && Math.abs(chosen - Math.round(chosen)) > EPS;
                    const done = free <= 0;

                    return (
                      <li key={item.id} className={`${styles.item} ${done ? styles.itemDone : ""}`}>
                        <div className={styles.itemRow}>
                          <span className={styles.itemText}>
                            <strong>{item.name}</strong>
                            <small>
                              {unitsLabel(Number(item.quantity))} adet · {formatLira(Number(item.unit_price))}
                              {paid > EPS && !done ? ` · ${unitsLabel(paid)} adedi ödendi` : ""}
                            </small>
                          </span>

                          {done ? (
                            <span className={`${flow.chip} ${paid >= Number(item.quantity) - EPS ? flow.chipOk : ""}`}>
                              {paid >= Number(item.quantity) - EPS ? "Ödendi" : "Ödeniyor"}
                            </span>
                          ) : fractional ? (
                            <span className={styles.selected}>
                              {unitsLabel(chosen)} pay · {formatLira(round2(chosen * Number(item.unit_price)))}
                              <button type="button" onClick={() => setUnits(item, 0)} aria-label="Seçimi kaldır">
                                <AuroraIcon name="close" size={14} />
                              </button>
                            </span>
                          ) : whole >= 1 ? (
                            <Stepper
                              value={Math.round(chosen)}
                              min={0}
                              max={whole}
                              onChange={(value) => setUnits(item, value)}
                              label={`${item.name} adedi`}
                            />
                          ) : null}
                        </div>

                        {!done && (
                          <>
                            <button
                              type="button"
                              className={styles.linkButton}
                              aria-expanded={shareOpen === item.id}
                              onClick={() => setShareOpen(shareOpen === item.id ? null : item.id)}
                            >
                              {shareOpen === item.id ? "Kapat" : "Paylaştık, payımı öderim"}
                            </button>
                            {shareOpen === item.id && (
                              <div className={styles.shares} role="group" aria-label="Kaç kişi paylaştınız?">
                                {SHARE_COUNTS.map((count) => {
                                  const units = 1 / count;
                                  const on = Math.abs(chosen - units) < 0.002;
                                  return (
                                    <button
                                      key={count}
                                      type="button"
                                      className={`${styles.pill} ${on ? styles.pillOn : ""}`}
                                      disabled={units > free + EPS}
                                      onClick={() => {
                                        setUnits(item, units);
                                        setShareOpen(null);
                                      }}
                                    >
                                      {count} kişi
                                    </button>
                                  );
                                })}
                                {free < 1 - EPS && (
                                  <button
                                    type="button"
                                    className={styles.pill}
                                    onClick={() => {
                                      setUnits(item, free);
                                      setShareOpen(null);
                                    }}
                                  >
                                    Kalan {unitsLabel(free)}
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {mode === "equal" && (
              <section className={flow.block} aria-labelledby="esit-bol">
                <span id="esit-bol" className={flow.kicker}>
                  Hesabı eşit bölün
                </span>

                {splitLocked && split ? (
                  <p className={flow.muted}>
                    Hesap masada <b>{split.of} kişiye</b> bölündü; {split.parts_taken} pay ödendi ya da ödeniyor.
                  </p>
                ) : (
                  <div className={styles.splitRow}>
                    <span>
                      <strong>Kaç kişisiniz?</strong>
                      <small>Kalan hesap kişi sayısına bölünür.</small>
                    </span>
                    <Stepper value={splitOf} min={2} max={20} onChange={setSplitOf} label="Kişi sayısı" />
                  </div>
                )}

                <div className={styles.bar} aria-hidden="true">
                  {Array.from({ length: effectiveOf }, (_, index) => (
                    <span
                      key={index}
                      className={
                        index < partsTaken ? styles.barPaid : index < partsTaken + effectiveParts ? styles.barMine : ""
                      }
                    />
                  ))}
                </div>

                {partsLeft > 0 ? (
                  <div className={styles.splitRow}>
                    <span>
                      <strong>Kaç pay ödüyorsunuz?</strong>
                      <small>Kişi başı {formatLira(share)}</small>
                    </span>
                    <Stepper value={effectiveParts} min={1} max={partsLeft} onChange={setParts} label="Pay sayısı" />
                  </div>
                ) : (
                  <p className={flow.muted}>Bütün paylar ödendi ya da ödeniyor.</p>
                )}
              </section>
            )}

            <section className={flow.block} aria-labelledby="bahsis">
              <span id="bahsis" className={flow.kicker}>
                Bahşiş (isteğe bağlı)
              </span>
              <div className={styles.shares} role="group" aria-label="Bahşiş">
                {TIP_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`${styles.pill} ${tipRate === rate ? styles.pillOn : ""}`}
                    onClick={() => setTipRate(rate)}
                  >
                    {rate === 0 ? "Yok" : `%${rate}`}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.pill} ${tipRate === "custom" ? styles.pillOn : ""}`}
                  onClick={() => setTipRate("custom")}
                >
                  Başka
                </button>
              </div>
              {tipRate === "custom" && (
                <label className={styles.tipInput}>
                  <span>₺</span>
                  <input
                    inputMode="decimal"
                    value={customTip}
                    onChange={(event) => setCustomTip(event.target.value.replace(/[^\d.,]/g, "").slice(0, 8))}
                    placeholder="0"
                    aria-label="Bahşiş tutarı"
                  />
                </label>
              )}
              <p className={flow.muted}>Bahşiş hesaptan ayrı gösterilir ve işletmeye iletilir.</p>
            </section>
          </>
        )}

        {submitError && (
          <p className={flow.error} role="alert">
            <AuroraIcon name="alert" size={16} />
            {submitError}
          </p>
        )}
      </div>

      {remaining > 0 && (
        <div className={flow.footer}>
          <div className={flow.footerInner}>
            <div className={flow.footerSum}>
              <span>Ödenecek</span>
              <strong>{formatLira(total)}</strong>
            </div>
            <div className={styles.breakdown}>
              <span>Hesap payı {formatLira(billAmount)}</span>
              {tip > 0 && <span>Bahşiş {formatLira(tip)}</span>}
            </div>
            <button type="button" className={flow.cta} onClick={() => void pay()} disabled={!canPay}>
              <AuroraIcon name="card" />
              {submitting
                ? "Ödeme sayfası açılıyor…"
                : billAmount < 1
                  ? mode === "items"
                    ? "Ödeyeceğiniz ürünleri seçin"
                    : "Tutar en az ₺1 olmalı"
                  : `${formatLira(total)} öde`}
            </button>
            <p className={flow.footerNote}>
              Kart bilgileriniz {info.providerName ?? "ödeme kuruluşunun"} güvenli ödeme sayfasında girilir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
