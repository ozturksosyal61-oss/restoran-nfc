import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import {
  getBillingAccess,
  loadBillingAccount,
  loadBillingSettings,
  loadPlans,
  refreshIfStale,
  type BillingAccount,
} from "../../../lib/billing/service";
import { graceEndsAt } from "../../../lib/billing/notice";
import AdminIcon from "../AdminIcon";
import { CancelForm, CardUpdateButton, ChangePlanForm, StartSubscriptionForm, type PlanOption } from "./BillingForms";

export const dynamic = "force-dynamic";

const STATUS: Record<BillingAccount["status"], { label: string; tone: string }> = {
  trial: { label: "Deneme", tone: "s-pending" },
  active: { label: "Aktif", tone: "s-ok" },
  past_due: { label: "Ödeme alınamadı", tone: "s-danger" },
  cancelled: { label: "İptal edildi", tone: "" },
  suspended: { label: "Durduruldu", tone: "s-danger" },
};

function formatDay(value: string | number | null) {
  if (value === null) return "—";
  return new Date(value).toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ sonuc?: string; mesaj?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");
  const params = await searchParams;

  const account = await refreshIfStale(await loadBillingAccount(admin.restaurantId));

  const header = (
    <header className="adm-head">
      <div className="adm-head-text">
        <span className="adm-eyebrow">Ayarlar</span>
        <h1>Abonelik</h1>
        <p>Paketiniz, ödeme kartınız ve faturalarınızın dönemi.</p>
      </div>
    </header>
  );

  if (!account) {
    return (
      <main className="adm-page">
        {header}
        <p className="adm-alert adm-alert-info" role="status">
          <AdminIcon name="info" size={16} />
          Aboneliğiniz OZT Digital tarafından yönetiliyor. Paket ve ödeme için bizimle iletişime geçin.
        </p>
      </main>
    );
  }

  const [access, { settings }, plans] = await Promise.all([
    getBillingAccess(admin.restaurantId),
    loadBillingSettings(),
    loadPlans(),
  ]);

  const options: PlanOption[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    monthly: plan.monthly_price,
    yearly: plan.yearly_price,
    monthlyReady: Boolean(settings?.plan_refs?.[plan.id]?.monthly?.ref),
    yearlyReady: Boolean(settings?.plan_refs?.[plan.id]?.yearly?.ref),
  }));

  const currentPlan = plans.find((plan) => plan.id === account.plan_id);
  const status = STATUS[account.status];
  const hasSubscription = Boolean(account.iyzico_subscription_ref) && account.status !== "cancelled";
  const graceDays = settings?.grace_days ?? 7;
  const price = currentPlan ? (account.billing_interval === "yearly" ? currentPlan.yearly_price : currentPlan.monthly_price) : null;
  const ready = Boolean(settings?.credentials) && options.some((option) => option.monthlyReady || option.yearlyReady);

  const defaults: Record<string, string> = {
    name: account.billing_name ?? "",
    surname: account.billing_surname ?? "",
    email: account.billing_email ?? admin.user.email ?? "",
    phone: account.billing_phone ? `0${account.billing_phone.replace(/^\+90/, "")}` : "",
    identity: account.billing_identity ?? "",
    city: account.billing_city ?? "",
    address: account.billing_address ?? "",
  };

  return (
    <main className="adm-page">
      {header}

      {params.sonuc === "ok" && (
        <p className="adm-alert adm-alert-ok" role="status">
          <AdminIcon name="check" size={16} />
          Aboneliğiniz başladı. Teşekkür ederiz!
        </p>
      )}
      {params.sonuc === "kart" && (
        <p className="adm-alert adm-alert-ok" role="status">
          <AdminIcon name="check" size={16} />
          Kartınız güncellendi.
        </p>
      )}
      {params.sonuc === "hata" && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          İşlem tamamlanamadı{params.mesaj ? `: ${params.mesaj}` : "."}
        </p>
      )}

      <section className="adm-card" aria-labelledby="abonelik-durum">
        <div className="adm-card-head">
          <div>
            <h2 id="abonelik-durum">{currentPlan?.name ?? "Paket"}</h2>
            <p>
              {price !== null ? `${price.toLocaleString("tr-TR")} ₺ / ${account.billing_interval === "yearly" ? "yıl" : "ay"} · ` : ""}
              {account.status === "trial" && !hasSubscription && `Deneme ${formatDay(account.trial_ends_at)} tarihinde bitiyor.`}
              {account.status === "active" && `Sonraki ödeme ${formatDay(account.paid_until)}.`}
              {account.status === "past_due" &&
                `Son ödeme alınamadı. ${formatDay(graceEndsAt(account, graceDays))} tarihine kadar kartınızı güncelleyin.`}
              {account.status === "cancelled" && account.paid_until && `${formatDay(account.paid_until)} tarihine kadar kullanılabilir.`}
              {account.status === "suspended" && "Hizmet OZT Digital tarafından durduruldu."}
            </p>
          </div>
        </div>
        <div className="adm-pay-status">
          <span className={`adm-badge is-dot ${status.tone}`}>{status.label}</span>
          <span className={`adm-badge ${access === "blocked" ? "s-danger" : access === "grace" ? "s-pending" : "s-ok"}`}>
            {access === "blocked" ? "Menü kapalı" : access === "grace" ? "Ek süre" : "Menü açık"}
          </span>
          {hasSubscription && <span className="adm-badge">Kart kayıtlı · otomatik yenileme</span>}
        </div>
        {account.last_error && account.status === "past_due" && (
          <p className="adm-alert adm-alert-error" style={{ margin: 0 }}>
            <AdminIcon name="alert" size={16} />
            Bankanın yanıtı: {account.last_error}
          </p>
        )}
      </section>

      {!ready ? (
        <p className="adm-alert adm-alert-info" role="status">
          <AdminIcon name="clock" size={16} />
          Kartla ödeme yakında açılacak. Deneme süreniz boyunca tüm özellikleri kullanabilirsiniz.
        </p>
      ) : !hasSubscription ? (
        <section className="adm-card" aria-labelledby="abonelik-baslat">
          <div className="adm-card-head">
            <div>
              <h2 id="abonelik-baslat">{account.status === "cancelled" ? "Aboneliği yeniden başlat" : "Aboneliği başlat"}</h2>
              <p>Paketinizi seçin, fatura bilgilerinizi girin; ardından kartınızı iyzico&apos;nun güvenli formuna eklersiniz.</p>
            </div>
          </div>
          <StartSubscriptionForm
            plans={options}
            planId={account.plan_id}
            interval={account.billing_interval}
            defaults={defaults}
            restart={account.status === "cancelled"}
          />
        </section>
      ) : (
        <>
          <section className="adm-card" aria-labelledby="abonelik-kart">
            <div className="adm-card-head">
              <div>
                <h2 id="abonelik-kart">Ödeme kartı</h2>
                <p>
                  {account.status === "past_due"
                    ? "Yeni kartı eklediğinizde alınamayan ödeme hemen yeniden denenir."
                    : "Kartınızı değiştirdiğinizde sonraki ödemeler yeni karttan alınır."}
                </p>
              </div>
            </div>
            <CardUpdateButton />
          </section>

          <section className="adm-card" aria-labelledby="abonelik-paket">
            <div className="adm-card-head">
              <div>
                <h2 id="abonelik-paket">Paketi değiştir</h2>
                <p>Yeni ücret bir sonraki dönemden itibaren alınır.</p>
              </div>
            </div>
            <ChangePlanForm plans={options} planId={account.plan_id} interval={account.billing_interval} />
          </section>

          <section className="adm-card" aria-labelledby="abonelik-iptal">
            <div className="adm-card-head">
              <div>
                <h2 id="abonelik-iptal">Aboneliği iptal et</h2>
                <p>Otomatik yenileme durur. Ödenmiş dönemin sonuna kadar kullanmaya devam edersiniz.</p>
              </div>
            </div>
            <CancelForm />
          </section>
        </>
      )}
    </main>
  );
}
