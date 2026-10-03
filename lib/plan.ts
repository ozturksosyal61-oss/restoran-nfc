// Paketler ve kapsadıkları özellikler: TEK KAYNAK.
// Panel (kilitli menü öğeleri, "bu özellik X paketinde" ekranı), sunucu
// işlemleri, müşteri menüsü ve paket karşılaştırma tablosu bu listeyi okur.
// Bir özelliği başka pakete taşımak için yalnızca FEATURE_INFO'daki "plan"
// alanını değiştirmek yeter.
//
// Başlangıç paketi "sadece menü"dür: tek QR, masa ve sipariş yok
// (veritabanında restaurants.menu_only pakete göre kendiliğinden ayarlanır:
// 20261015_plan_menu_only.sql).

export type Plan = "starter" | "pro" | "premium";

export type PlanFeature =
  // Başlangıç
  | "digital_menu"
  | "qr"
  | "popup"
  | "feedback"
  | "menu_stats"
  // Pro
  | "nfc"
  | "tables"
  | "orders"
  | "waiter_call"
  | "analytics"
  | "languages"
  // Premium
  | "online_payment"
  | "multi_user"
  | "staff_ratings"
  | "advanced_reports"
  | "calories"
  | "ai";

const PLAN_ORDER: Plan[] = ["starter", "pro", "premium"];

const PLAN_LABELS: Record<Plan, string> = {
  starter: "BAŞLANGIÇ",
  pro: "PRO",
  premium: "PREMIUM",
};

const PLAN_NAMES: Record<Plan, string> = {
  starter: "Başlangıç",
  pro: "Pro",
  premium: "Premium",
};

// Her özelliğin ilk açıldığı paket ve müşteriye gösterilen adı.
export const FEATURE_INFO: Record<PlanFeature, { plan: Plan; label: string }> = {
  digital_menu: { plan: "starter", label: "QR dijital menü, ürün ve kategori yönetimi" },
  qr: { plan: "starter", label: "QR kod" },
  popup: { plan: "starter", label: "Menü açılış duyurusu" },
  feedback: { plan: "starter", label: "Geri bildirim ve Google yorum yönlendirmesi" },
  menu_stats: { plan: "starter", label: "Menü istatistikleri" },

  nfc: { plan: "pro", label: "Masaya özel QR ve NFC" },
  tables: { plan: "pro", label: "Masa yönetimi" },
  orders: { plan: "pro", label: "Masadan sipariş ve sipariş takibi" },
  waiter_call: { plan: "pro", label: "Garson çağırma ve hesap isteme" },
  analytics: { plan: "pro", label: "Satış raporları ve dönem özeti" },
  languages: { plan: "pro", label: "Çok dilli menü" },

  online_payment: { plan: "premium", label: "Masadan kartla ödeme, hesap bölüşme, bahşiş" },
  multi_user: { plan: "premium", label: "Çalışanlar, garson ve mutfak ekranları" },
  staff_ratings: { plan: "premium", label: "Çalışan değerlendirme" },
  advanced_reports: { plan: "premium", label: "Excel rapor ve ürün satış analizi" },
  calories: { plan: "premium", label: "Kalori bilgileri" },
  ai: { plan: "premium", label: "Yapay zekâ: fotoğraftan menü aktarma, otomatik çeviri, kalori tahmini" },
};

export function normalizePlan(value: unknown): Plan {
  if (value === "premium") return "premium";
  if (value === "pro") return "pro";
  return "starter";
}

export function hasPlanFeature(plan: unknown, feature: PlanFeature): boolean {
  return PLAN_ORDER.indexOf(normalizePlan(plan)) >= PLAN_ORDER.indexOf(FEATURE_INFO[feature].plan);
}

export function getPlanFeatures(plan: unknown): PlanFeature[] {
  return (Object.keys(FEATURE_INFO) as PlanFeature[]).filter((feature) => hasPlanFeature(plan, feature));
}

// Özelliğin açıldığı en düşük paket.
export function featurePlan(feature: PlanFeature): Plan {
  return FEATURE_INFO[feature].plan;
}

export function getPlanLabel(plan: unknown): string {
  return PLAN_LABELS[normalizePlan(plan)];
}

export function getPlanName(plan: unknown): string {
  return PLAN_NAMES[normalizePlan(plan)];
}

export function isStarter(plan: unknown): boolean {
  return normalizePlan(plan) === "starter";
}

export function isProOrHigher(plan: unknown): boolean {
  return normalizePlan(plan) !== "starter";
}

export function isPremium(plan: unknown): boolean {
  return normalizePlan(plan) === "premium";
}

// Karşılaştırma tablosu için: her paketle yeni açılan özellikler.
export function featuresAddedIn(plan: Plan): PlanFeature[] {
  return (Object.keys(FEATURE_INFO) as PlanFeature[]).filter(
    (feature) => FEATURE_INFO[feature].plan === plan && feature !== "qr" && feature !== "tables"
  );
}

export function planLockMessage(feature: PlanFeature) {
  return `${FEATURE_INFO[feature].label} ${PLAN_NAMES[featurePlan(feature)]} paketinde kullanılabilir.`;
}

export function requirePlanFeature(plan: unknown, feature: PlanFeature): void {
  if (!hasPlanFeature(plan, feature)) {
    throw new Error(planLockMessage(feature));
  }
}
