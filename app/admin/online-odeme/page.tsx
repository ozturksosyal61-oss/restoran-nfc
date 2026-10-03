import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { hasPlanFeature } from "../../../lib/plan";
import { readMenuOnly } from "../../../lib/restaurant-type";
import { encryptionConfigured } from "../../../lib/payments/crypto";
import {
  loadPaymentSettings,
  loadTransaction,
  loadTransactions,
  requestContext,
} from "../../../lib/payments/service";
import AdminIcon from "../AdminIcon";
import PaymentView from "./PaymentView";

export default async function OnlinePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>;
}) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { supabase, restaurantId } = admin;
  const params = await searchParams;

  const [{ data: restaurant }, menuOnly] = await Promise.all([
    supabase.from("restaurants").select("plan").eq("id", restaurantId).maybeSingle(),
    readMenuOnly(supabase, restaurantId),
  ]);
  const allowed = !menuOnly && hasPlanFeature(restaurant?.plan, "online_payment");

  const header = (
    <header className="adm-head">
      <div className="adm-head-text">
        <span className="adm-eyebrow">Ayarlar</span>
        <h1>Online ödeme</h1>
        <p>
          Kendi iyzico ya da PayTR hesabınızı bağlayın. Müşterinin ödediği para doğrudan sizin hesabınıza geçer;
          kart bilgileri sağlayıcının güvenli ödeme sayfasında girilir, bizim sistemimize hiç gelmez.
        </p>
      </div>
    </header>
  );

  if (!allowed) {
    return (
      <main className="adm-page">
        {header}
        <p className="adm-alert adm-alert-info" role="status">
          <AdminIcon name="lock" size={16} />
          Masadan kartla ödeme Premium paketinde kullanılabilir.
        </p>
      </main>
    );
  }

  const keyReady = encryptionConfigured();
  const { settings, tablesMissing } = await loadPaymentSettings(restaurantId);
  const [history, bills, current, context] = await Promise.all([
    tablesMissing ? Promise.resolve([]) : loadTransactions(restaurantId, "test", 5),
    tablesMissing ? Promise.resolve([]) : loadTransactions(restaurantId, "bill", 10),
    params.test && !tablesMissing ? loadTransaction(params.test, restaurantId) : Promise.resolve(null),
    requestContext(),
  ]);

  return (
    <PaymentView
      header={header}
      keyReady={keyReady}
      tablesMissing={tablesMissing}
      settings={settings}
      history={history}
      bills={bills}
      current={current}
      notificationUrl={`${context.origin}/api/odeme/paytr/bildirim`}
    />
  );
}
