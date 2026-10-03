import Link from "next/link";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { encryptionConfigured, ENCRYPTION_KEY_MISSING_MESSAGE } from "../../../lib/payments/crypto";
import { requestContext } from "../../../lib/payments/service";
import { BILLING_MISSING_MESSAGE, loadBillingSettings, loadPlans, type BillingAccount } from "../../../lib/billing/service";
import AdminIcon from "../../admin/AdminIcon";
import { BillingSettingsForm, ConnectionActions } from "./BillingAdminForms";

export const dynamic = "force-dynamic";

const STATUS: Record<BillingAccount["status"], { label: string; tone: string }> = {
  trial: { label: "Deneme", tone: "s-pending" },
  active: { label: "Aktif", tone: "s-ok" },
  past_due: { label: "Ödeme alınamadı", tone: "s-danger" },
  cancelled: { label: "İptal", tone: "" },
  suspended: { label: "Durduruldu", tone: "s-danger" },
};

function formatDay(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric" })
    : "—";
}

function lira(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

export default async function BillingSettingsPage() {
  await requireSystemAdmin();
  const [{ settings, missing }, plans, context] = await Promise.all([loadBillingSettings(), loadPlans(), requestContext()]);

  const admin = createSupabaseAdminClient();
  const { data: accountRows } = missing
    ? { data: [] }
    : await admin
        .from("billing_accounts")
        .select("restaurant_id, plan_id, billing_interval, status, trial_ends_at, paid_until, iyzico_subscription_ref")
        .order("updated_at", { ascending: false });
  const accounts = (accountRows ?? []) as Pick<
    BillingAccount,
    "restaurant_id" | "plan_id" | "billing_interval" | "status" | "trial_ends_at" | "paid_until" | "iyzico_subscription_ref"
  >[];
  const ids = accounts.map((account) => account.restaurant_id);
  const { data: restaurants } = ids.length
    ? await admin.from("restaurants").select("id, name").in("id", ids)
    : { data: [] as { id: number; name: string }[] };
  const names = new Map((restaurants ?? []).map((row) => [Number(row.id), String(row.name)]));
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const hasKeys = Boolean(settings?.credentials);
  const refs = settings?.plan_refs ?? {};

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Yönetim</span>
          <h1>Otomatik ödeme</h1>
          <p>
            Restoranların abonelik ücreti sizin iyzico hesabınızdan her dönem otomatik çekilir. Deneme ve ek süre
            dolunca restoranın paneli ve müşteri menüsü kapanır. Elle yönettiğiniz restoranlar etkilenmez.
          </p>
        </div>
      </header>

      {missing && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {BILLING_MISSING_MESSAGE}
        </p>
      )}
      {!encryptionConfigured() && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {ENCRYPTION_KEY_MISSING_MESSAGE}
        </p>
      )}

      <section className="adm-card" aria-labelledby="iyz-hesap">
        <div className="adm-card-head">
          <div>
            <h2 id="iyz-hesap">iyzico hesabınız</h2>
            <p>
              Kendi şirketinizin iyzico üye işyeri hesabı. Hesabınızda “Abonelik” ürününün açık olması gerekir; anahtarlar
              iyzico panelinde Ayarlar → Firma Ayarları bölümündedir.
            </p>
          </div>
        </div>
        <BillingSettingsForm
          mode={settings?.mode ?? "test"}
          hints={settings?.credentials_hint ?? {}}
          trialDays={settings?.trial_days ?? 7}
          graceDays={settings?.grace_days ?? 7}
        />
      </section>

      <section className="adm-card" aria-labelledby="iyz-planlar">
        <div className="adm-card-head">
          <div>
            <h2 id="iyz-planlar">Paketler ve iyzico ödeme planları</h2>
            <p>
              Her paketin aylık ve yıllık fiyatı iyzico&apos;da bir ödeme planına karşılık gelir. Paket fiyatını değiştirince
              yeniden aktarın; mevcut aboneler eski fiyattan devam eder.
            </p>
          </div>
        </div>
        <ul className="adm-pay-history">
          {plans.map((plan) => (
            <li key={plan.id}>
              <div>
                <strong>{plan.name}</strong>
                <span className="adm-hint">
                  {lira(plan.monthly_price)} / ay · {lira(plan.yearly_price)} / yıl
                </span>
              </div>
              <span className={`adm-badge ${refs[plan.id]?.monthly?.ref ? "s-ok" : ""}`}>
                {refs[plan.id]?.monthly?.price === plan.monthly_price && refs[plan.id]?.yearly?.price === plan.yearly_price
                  ? "iyzico'da hazır"
                  : refs[plan.id]?.monthly?.ref
                    ? "Fiyat değişti, yeniden aktarın"
                    : "Aktarılmadı"}
              </span>
            </li>
          ))}
        </ul>
        <ConnectionActions disabled={!hasKeys} />
        <div className="adm-field">
          <span className="adm-label">iyzico bildirim (webhook) adresi</span>
          <code className="adm-code">{`${context.origin}/api/abonelik/iyzico/bildirim`}</code>
          <span className="adm-hint">iyzico panelinde Ayarlar → Bildirim ayarlarına bu adresi kaydedin.</span>
        </div>
      </section>

      <section className="adm-card" aria-labelledby="iyz-restoranlar">
        <div className="adm-card-head">
          <div>
            <h2 id="iyz-restoranlar">Otomatik ödemedeki restoranlar</h2>
            <p>Restoranı açıp “Otomatik ödeme” bölümünden açabilir, durdurabilir ya da elle yönetime alabilirsiniz.</p>
          </div>
        </div>
        {accounts.length === 0 ? (
          <p className="adm-hint" style={{ margin: 0 }}>Henüz otomatik ödemede restoran yok.</p>
        ) : (
          <ul className="adm-pay-history">
            {accounts.map((account) => (
              <li key={account.restaurant_id}>
                <div>
                  <Link className="sys-link" href={`/sistem/restoran/${account.restaurant_id}`}>
                    {names.get(account.restaurant_id) ?? `Restoran #${account.restaurant_id}`}
                  </Link>
                  <span className="adm-hint">
                    {planNames.get(account.plan_id) ?? "Paket"} · {account.billing_interval === "yearly" ? "Yıllık" : "Aylık"} ·{" "}
                    {account.status === "trial" ? `deneme ${formatDay(account.trial_ends_at)}` : `ödenen dönem ${formatDay(account.paid_until)}`}
                    {account.iyzico_subscription_ref ? " · kart kayıtlı" : ""}
                  </span>
                </div>
                <span className={`adm-badge is-dot ${STATUS[account.status].tone}`}>{STATUS[account.status].label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
