// Raporlarda kullanılan iş günü ve dönem hesapları.
//
// İş günü İstanbul saatiyle 05:00'te başlar (veritabanındaki
// business_day() ile aynı). Türkiye yaz saati uygulamadığı için saat
// farkı her zaman +03:00'tür.

const OFFSET_HOURS = 3;
const DAY_START_HOUR = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-09-30" biçimindeki iş gününün başladığı an.
export function businessDayStart(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, DAY_START_HOUR - OFFSET_HOURS));
}

export function businessDayOf(at: Date) {
  return new Date(at.getTime() + (OFFSET_HOURS - DAY_START_HOUR) * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function addDays(day: string, amount: number) {
  return new Date(businessDayStart(day).getTime() + amount * DAY_MS + (OFFSET_HOURS - DAY_START_HOUR) * 3600000)
    .toISOString()
    .slice(0, 10);
}

function isValidDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(businessDayStart(value).getTime());
}

export type PeriodKey =
  | "bugun"
  | "dun"
  | "bu-hafta"
  | "gecen-hafta"
  | "bu-ay"
  | "gecen-ay"
  | "son-7"
  | "son-30"
  | "ozel";

export const PERIOD_OPTIONS: { key: Exclude<PeriodKey, "ozel">; label: string }[] = [
  { key: "bugun", label: "Bugün" },
  { key: "dun", label: "Dün" },
  { key: "son-7", label: "Son 7 gün" },
  { key: "bu-hafta", label: "Bu hafta" },
  { key: "gecen-hafta", label: "Geçen hafta" },
  { key: "bu-ay", label: "Bu ay" },
  { key: "gecen-ay", label: "Geçen ay" },
  { key: "son-30", label: "Son 30 gün" },
];

export type Period = {
  key: PeriodKey;
  // Dahil olan ilk ve son iş günü (YYYY-MM-DD)
  firstDay: string;
  lastDay: string;
  days: number;
  from: Date;
  to: Date;
  label: string;
  // Karşılaştırma için bir önceki eşit uzunluktaki dönem
  previous: { firstDay: string; lastDay: string; from: Date; to: Date; label: string };
};

const MAX_DAYS = 366;

function formatDay(day: string, withYear = false) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

export function formatRange(firstDay: string, lastDay: string) {
  if (firstDay === lastDay) return formatDay(firstDay, true);
  const sameYear = firstDay.slice(0, 4) === lastDay.slice(0, 4);
  return `${formatDay(firstDay, !sameYear)} – ${formatDay(lastDay, true)}`;
}

function build(key: PeriodKey, firstDay: string, lastDay: string, label: string): Period {
  const days = Math.round((businessDayStart(lastDay).getTime() - businessDayStart(firstDay).getTime()) / DAY_MS) + 1;
  const previousLast = addDays(firstDay, -1);
  const previousFirst = addDays(firstDay, -days);

  return {
    key,
    firstDay,
    lastDay,
    days,
    from: businessDayStart(firstDay),
    to: businessDayStart(addDays(lastDay, 1)),
    label,
    previous: {
      firstDay: previousFirst,
      lastDay: previousLast,
      from: businessDayStart(previousFirst),
      to: businessDayStart(firstDay),
      label: formatRange(previousFirst, previousLast),
    },
  };
}

export function resolvePeriod(
  params: { donem?: string; bas?: string; bit?: string },
  fallback: Exclude<PeriodKey, "ozel"> = "bugun",
  now = new Date()
): Period {
  const today = businessDayOf(now);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Pazartesi = 0
  const monthStart = `${today.slice(0, 7)}-01`;

  if (params.donem === "ozel" && isValidDay(params.bas) && isValidDay(params.bit)) {
    let first = params.bas <= params.bit ? params.bas : params.bit;
    const last = params.bas <= params.bit ? params.bit : params.bas;
    if (Math.round((businessDayStart(last).getTime() - businessDayStart(first).getTime()) / DAY_MS) + 1 > MAX_DAYS) {
      first = addDays(last, -(MAX_DAYS - 1));
    }
    return build("ozel", first, last, formatRange(first, last));
  }

  const key = PERIOD_OPTIONS.some((option) => option.key === params.donem)
    ? (params.donem as Exclude<PeriodKey, "ozel">)
    : fallback;

  switch (key) {
    case "dun": {
      const day = addDays(today, -1);
      return build(key, day, day, `Dün · ${formatDay(day)}`);
    }
    case "son-7":
      return build(key, addDays(today, -6), today, `Son 7 gün · ${formatRange(addDays(today, -6), today)}`);
    case "bu-hafta": {
      const first = addDays(today, -weekday);
      return build(key, first, today, `Bu hafta · ${formatRange(first, today)}`);
    }
    case "gecen-hafta": {
      const first = addDays(today, -weekday - 7);
      const last = addDays(first, 6);
      return build(key, first, last, `Geçen hafta · ${formatRange(first, last)}`);
    }
    case "bu-ay":
      return build(key, monthStart, today, `Bu ay · ${formatRange(monthStart, today)}`);
    case "gecen-ay": {
      const last = addDays(monthStart, -1);
      const first = `${last.slice(0, 7)}-01`;
      return build(key, first, last, `Geçen ay · ${formatRange(first, last)}`);
    }
    case "son-30":
      return build(key, addDays(today, -29), today, `Son 30 gün · ${formatRange(addDays(today, -29), today)}`);
    case "bugun":
    default:
      return build("bugun", today, today, `Bugün · ${formatDay(today)}`);
  }
}

// Dönemdeki tüm iş günleri (grafikte boş günler de görünsün diye).
export function daysOf(period: Period) {
  return Array.from({ length: period.days }, (_, index) => addDays(period.firstDay, index));
}

export function shortDayLabel(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  if (days <= 7) {
    return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(date);
  }
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);
}

export function longDayLabel(day: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

export const WEEKDAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/* ---------------- Haftalık / aylık özet dönemleri ---------------- */

export type SummaryKind = "hafta" | "ay";

type Range = { firstDay: string; lastDay: string; from: Date; to: Date; label: string };

export type SummaryPeriod = Range & {
  kind: SummaryKind;
  // Dönemin ilk günü; bağlantılarda dönemi tanımlar.
  key: string;
  // Dönem henüz bitmedi mi (bu hafta / bu ay)?
  ongoing: boolean;
  days: number;
  previous: Range;
};

function range(firstDay: string, lastDay: string, label: string): Range {
  return { firstDay, lastDay, from: businessDayStart(firstDay), to: businessDayStart(addDays(lastDay, 1)), label };
}

function dayCount(firstDay: string, lastDay: string) {
  return Math.round((businessDayStart(lastDay).getTime() - businessDayStart(firstDay).getTime()) / DAY_MS) + 1;
}

function monthName(firstDay: string) {
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${firstDay}T12:00:00Z`)
  );
}

function lastDayOfMonth(firstDay: string) {
  const [year, month] = firstDay.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function previousMonthStart(firstDay: string) {
  const [year, month] = firstDay.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
}

function mondayOf(day: string) {
  const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

function buildSummary(kind: SummaryKind, start: string, today: string): SummaryPeriod {
  const fullLast = kind === "hafta" ? addDays(start, 6) : lastDayOfMonth(start);
  const ongoing = fullLast >= today;
  const lastDay = ongoing ? today : fullLast;
  const days = dayCount(start, lastDay);

  const previousStart = kind === "hafta" ? addDays(start, -7) : previousMonthStart(start);
  const previousFullLast = kind === "hafta" ? addDays(previousStart, 6) : lastDayOfMonth(previousStart);
  // Devam eden dönem, önceki dönemin aynı gün sayısıyla karşılaştırılır.
  const candidate = addDays(previousStart, days - 1);
  const previousLast = ongoing && candidate < previousFullLast ? candidate : previousFullLast;

  const label =
    kind === "ay"
      ? `${monthName(start)}${ongoing ? " · devam ediyor" : ""}`
      : `${formatRange(start, fullLast)}${ongoing ? " · devam ediyor" : ""}`;

  const previousLabel =
    kind === "ay" && previousLast === previousFullLast
      ? monthName(previousStart)
      : formatRange(previousStart, previousLast);

  return {
    ...range(start, lastDay, label),
    kind,
    key: start,
    ongoing,
    days,
    previous: range(previousStart, previousLast, previousLabel),
  };
}

// Seçim listesi: son 12 hafta ya da son 12 ay (yeniden eskiye).
export function summaryOptions(kind: SummaryKind, now = new Date()) {
  const today = businessDayOf(now);
  let start = kind === "hafta" ? mondayOf(today) : `${today.slice(0, 7)}-01`;
  const options: SummaryPeriod[] = [];

  for (let i = 0; i < 12; i++) {
    options.push(buildSummary(kind, start, today));
    start = kind === "hafta" ? addDays(start, -7) : previousMonthStart(start);
  }
  return options;
}

// Varsayılan: son tamamlanan hafta ya da ay.
export function resolveSummary(kind: SummaryKind, key: string | undefined, now = new Date()) {
  const options = summaryOptions(kind, now);
  return options.find((option) => option.key === key) ?? options[1];
}
