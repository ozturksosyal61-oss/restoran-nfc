// Sistem sayfalarında ortak biçimlendirme (sunucu ve istemci).

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

const dateOnly = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeZone: "Europe/Istanbul",
});

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTime.format(new Date(value)) : null;
}

export function formatDate(value: string | null | undefined) {
  return value ? dateOnly.format(new Date(value)) : null;
}

export function formatLira(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: string }> = {
  trial: { label: "Deneme", tone: "s-pending" },
  active: { label: "Aktif", tone: "s-ok" },
  cancelled: { label: "İptal", tone: "s-delivered" },
  expired: { label: "Süresi doldu", tone: "s-danger" },
};

// Aboneliğin bitiş tarihi ve kalan gün. İstemcide sunucunun "şimdi"si
// verilir; böylece sunucu ve tarayıcı aynı sonucu çizer.
export function subscriptionEnd(
  subscription: {
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
  },
  now = Date.now()
) {
  const end = subscription.status === "trial" ? subscription.trial_ends_at : subscription.current_period_end;
  if (!end) return { end: null, daysLeft: null };
  const daysLeft = Math.max(0, Math.ceil((new Date(end).getTime() - now) / 86_400_000));
  return { end, daysLeft };
}

export function initialOf(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";
}
