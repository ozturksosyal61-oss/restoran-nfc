import type { Access, BillingAccount } from "./service";

// Yönetim panelinin üstünde gösterilen abonelik uyarısı. Kural veritabanındaki
// billing_access ile aynıdır; burada yalnızca kalan gün ve metin hesaplanır.

export type BillingNotice = {
  tone: "info" | "warn" | "danger";
  title: string;
  text: string;
};

const DAY = 24 * 60 * 60 * 1000;

function formatDay(value: number) {
  return new Date(value).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" });
}

function time(value: string | null) {
  return value ? new Date(value).getTime() : null;
}

// Ek sürenin bittiği an (billing_access ile aynı taban).
export function graceEndsAt(account: BillingAccount, graceDays: number) {
  const base = Math.max(time(account.paid_until) ?? 0, time(account.past_due_since) ?? 0, time(account.trial_ends_at) ?? 0);
  return (base || (time(account.updated_at) ?? Date.now())) + graceDays * DAY;
}

export function billingNotice(account: BillingAccount | null, access: Access, graceDays: number): BillingNotice | null {
  if (!account) return null;
  const now = Date.now();
  const hasCard = Boolean(account.iyzico_subscription_ref) && account.status !== "cancelled";

  if (access === "blocked") {
    return {
      tone: "danger",
      title: "Hizmetiniz durduruldu",
      text: "Müşteri menünüz ve paneliniz kapalı. Abonelik sayfasından ödemenizi tamamlayınca hemen açılır.",
    };
  }

  if (access === "grace") {
    const left = Math.max(1, Math.ceil((graceEndsAt(account, graceDays) - now) / DAY));
    return account.status === "trial"
      ? {
          tone: "danger",
          title: "Deneme süreniz doldu",
          text: `${left} gün içinde aboneliğinizi başlatmazsanız müşteri menünüz ve paneliniz kapanacak.`,
        }
      : {
          tone: "danger",
          title: "Ödemeniz alınamadı",
          text: `${left} gün içinde kartınızı güncellemezseniz müşteri menünüz ve paneliniz kapanacak.`,
        };
  }

  if (account.status === "trial" && !hasCard && account.trial_ends_at) {
    const left = Math.max(0, Math.ceil(((time(account.trial_ends_at) ?? now) - now) / DAY));
    return {
      tone: left <= 2 ? "warn" : "info",
      title: left === 0 ? "Deneme süreniz bugün bitiyor" : `Deneme süreniz: ${left} gün kaldı`,
      text: "Kesintisiz kullanım için abonelik sayfasından kartınızı ekleyin.",
    };
  }

  if (account.status === "cancelled" && account.paid_until) {
    return {
      tone: "warn",
      title: "Aboneliğiniz iptal edildi",
      text: `${formatDay(time(account.paid_until) ?? now)} tarihine kadar kullanabilirsiniz. Devam etmek için aboneliği yeniden başlatın.`,
    };
  }

  return null;
}
