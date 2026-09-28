// Veritabanındaki "08:00:00" biçimini "08:00" yapar.
function shortTime(value: string | null | undefined) {
  return value ? String(value).slice(0, 5) : "";
}

// İşletme ayarlarında girilen açılış / kapanış saatini tek satıra çevirir.
// Hiç saat girilmemişse null döner; çağıran taraf bölümü gizler.
export function formatHours(
  opening: string | null | undefined,
  closing: string | null | undefined
) {
  const open = shortTime(opening);
  const close = shortTime(closing);

  if (open && close) return `${open} — ${close}`;
  if (open) return `Açılış ${open}`;
  if (close) return `Kapanış ${close}`;

  return null;
}

// Sayının okunuşundaki son kelimeye göre yönelme eki ("'e", "'ye", "'a", "'ya").
function datSuffix(value: number) {
  const units = value % 10;
  const tens = Math.floor(value / 10) % 10;

  // bir, üç, dört, beş, sekiz → 'e · iki, yedi → 'ye · altı → 'ya · dokuz, sıfır → 'a
  const byUnit = ["'a", "'e", "'ye", "'e", "'e", "'e", "'ya", "'ye", "'e", "'a"];
  // on, otuz, kırk → 'a · yirmi, elli → 'ye
  const byTen = ["'a", "'a", "'ye", "'a", "'a", "'ye"];

  if (units !== 0 || value === 0) return byUnit[units];
  return byTen[tens] ?? "'a";
}

// "24:00:00" → "24:00'e kadar", "22:00" → "22:00'ye kadar", "19:30" → "19:30'a kadar"
export function untilLabel(closing: string | null | undefined) {
  const close = shortTime(closing);
  if (!/^\d{2}:\d{2}$/.test(close)) return null;

  const [hour, minute] = close.split(":").map(Number);
  const suffix = datSuffix(minute === 0 ? hour : minute);

  return `${close}${suffix} kadar`;
}
