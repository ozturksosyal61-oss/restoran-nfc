// Kartla ödeme ekranları ve dekont için ortak küçük yardımcılar.

export const EPS = 0.001;

// Kartla ödeme açıksa masa hesabı ekranında gösterilecek özet.
export type OnlinePayment = { enabled: boolean; due: number; paid: number } | null;

// Yarım kalmış ödemenin işlem numarası (aynı telefonda hatırlatma için).
export function pendingKey(slug: string) {
  return `ozt_pay_ref_${slug}`;
}

// 0.3333 → "1/3", 2 → "2", 0.6667 → "2/3"
export function unitsLabel(units: number) {
  if (Math.abs(units - Math.round(units)) < EPS) return String(Math.round(units));
  for (let d = 2; d <= 12; d += 1) {
    const n = Math.round(units * d);
    if (n > 0 && Math.abs(units - n / d) < 0.002) return `${n}/${d}`;
  }
  return units.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}
