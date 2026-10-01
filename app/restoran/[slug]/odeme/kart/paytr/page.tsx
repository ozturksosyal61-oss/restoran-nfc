import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../../../../lib/supabase-admin";
import { paytrFrameUrl } from "../../../../../../lib/payments/paytr";
import { loadTransaction } from "../../../../../../lib/payments/service";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../../../../lib/themes";
import { auroraFontVariables } from "../../../aurora-fonts";
import palette from "../../../aurora-palette.module.css";
import AuroraIcon from "../../../AuroraIcon";
import flow from "../../../AuroraFlow.module.css";
import styles from "../../TablePay.module.css";
import CancelPaymentButton from "../../CancelPaymentButton";

export const metadata: Metadata = {
  title: "Güvenli ödeme",
  robots: { index: false },
};

// PayTR'nin güvenli ödeme çerçevesi. Kart bilgisi PayTR'nin sayfasında girilir.
export default async function PaytrTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ slug }, { ref = "" }] = await Promise.all([params, searchParams]);

  const { data: restaurant } = await createSupabaseAdminClient()
    .from("restaurants")
    .select("id, slug, theme")
    .eq("slug", slug)
    .maybeSingle();
  if (!restaurant) notFound();

  const tx = await loadTransaction(ref, Number(restaurant.id));
  if (!tx || tx.kind !== "bill" || tx.provider !== "paytr") notFound();

  const receipt = `/restoran/${encodeURIComponent(restaurant.slug)}/odeme/dekont?ref=${encodeURIComponent(tx.reference)}`;
  if (tx.status !== "pending" || !tx.provider_token) redirect(receipt);

  const auroraPalette = getAuroraPalette(normalizeRestaurantTheme(restaurant.theme));
  const payHref = `/restoran/${encodeURIComponent(restaurant.slug)}/odeme/kart`;

  return (
    <div className={`${palette.shell} ${auroraFontVariables}`} data-palette={auroraPalette ?? undefined}>
      <div className={flow.page}>
        <div className={flow.column}>
          <header className={flow.top}>
            <h1>Güvenli ödeme</h1>
            <span className={flow.num}>₺{Number(tx.amount).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</span>
          </header>
          <div className={styles.frame}>
            <iframe src={paytrFrameUrl(tx.provider_token)} title="PayTR güvenli ödeme" allow="payment" />
          </div>
          <CancelPaymentButton slug={restaurant.slug} reference={tx.reference} href={payHref} className={flow.ghost}>
            <AuroraIcon name="close" size={16} />
            Vazgeç
          </CancelPaymentButton>
        </div>
      </div>
    </div>
  );
}
