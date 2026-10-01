import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { paytrFrameUrl } from "../../../../lib/payments/paytr";
import { loadTransaction, testResultPath } from "../../../../lib/payments/service";
import AdminIcon from "../../AdminIcon";

// PayTR'nin güvenli ödeme çerçevesi. Kart bilgisi PayTR'nin sayfasında girilir.
export default async function PaytrFramePage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");

  const { ref = "" } = await searchParams;
  const tx = await loadTransaction(ref, admin.restaurantId);
  if (!tx || tx.provider !== "paytr") redirect("/admin/online-odeme");
  if (tx.status !== "pending" || !tx.provider_token) redirect(testResultPath(tx.reference));

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Online ödeme · Bağlantı testi</span>
          <h1>PayTR test ödemesi</h1>
          <p>Kart bilgilerini aşağıdaki PayTR ekranına girin. Ödeme bitince sonuç sayfasına dönersiniz.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href={testResultPath(tx.reference)}>
            <AdminIcon name="close" size={16} />
            Vazgeç
          </Link>
        </div>
      </header>
      <section className="adm-card adm-pay-frame">
        <iframe src={paytrFrameUrl(tx.provider_token)} title="PayTR güvenli ödeme" allow="payment" />
      </section>
    </main>
  );
}
