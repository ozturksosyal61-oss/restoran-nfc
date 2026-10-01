import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import { PROVIDERS } from "../../../../../lib/payments/providers";
import { CANCELLED_MESSAGE, loadTransaction } from "../../../../../lib/payments/service";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../../../lib/themes";
import { auroraFontVariables } from "../../aurora-fonts";
import palette from "../../aurora-palette.module.css";
import AuroraIcon from "../../AuroraIcon";
import { formatLira } from "../../aurora-utils";
import flow from "../../AuroraFlow.module.css";
import styles from "../TablePay.module.css";
import { unitsLabel } from "../pay-utils";
import { PrintButton, ReceiptWatcher } from "./ReceiptControls";

export const metadata: Metadata = {
  title: "Ödeme dekontu",
  robots: { index: false },
};

type Line = { name: string; units: number; amount: number };

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Masadan yapılan kartla ödemenin sonucu ve dekontu. İşlem numarası
// tahmin edilemez bir anahtardır; bağlantıyı bilen dekontu görebilir.
export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ slug }, { ref = "" }] = await Promise.all([params, searchParams]);
  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, slug, address, theme")
    .eq("slug", slug)
    .maybeSingle();
  if (!restaurant) notFound();

  const tx = await loadTransaction(ref, Number(restaurant.id));
  if (!tx || tx.kind !== "bill") notFound();

  const auroraPalette = getAuroraPalette(normalizeRestaurantTheme(restaurant.theme));
  const base = `/restoran/${encodeURIComponent(restaurant.slug)}`;
  const billHref = `${base}/odeme`;
  const payHref = `${base}/odeme/kart`;
  const pending = tx.status === "pending";
  const paid = tx.status === "success" || tx.status === "refunded";

  let lines: Line[] = [];
  let tableNumber: string | null = null;
  let sessionClosed = false;

  if (paid) {
    const [{ data: allocations }, { data: table }, { data: session }] = await Promise.all([
      admin.from("payment_allocations").select("units, amount, order_items(product_name)").eq("transaction_id", tx.id),
      tx.table_id
        ? admin.from("restaurant_tables").select("table_number").eq("id", tx.table_id).maybeSingle()
        : Promise.resolve({ data: null }),
      tx.session_id
        ? admin.from("dining_sessions").select("status").eq("id", tx.session_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    lines = (allocations ?? []).map((row) => {
      const item = row.order_items as unknown as { product_name?: string } | { product_name?: string }[] | null;
      const name = (Array.isArray(item) ? item[0]?.product_name : item?.product_name) ?? "Ürün";
      return { name, units: Number(row.units), amount: Number(row.amount) };
    });
    tableNumber = table?.table_number != null ? String(table.table_number) : null;
    sessionClosed = session?.status === "closed";
  }

  const tip = Number(tx.tip_amount ?? 0);
  const billPart = Number(tx.amount) - tip;
  const providerName = PROVIDERS[tx.provider]?.name ?? tx.provider;

  const header = (
    <header className={`${flow.top} ${styles.noPrint}`}>
      <a className={flow.round} href={billHref} aria-label="Masa hesabına dön">
        <AuroraIcon name="back" />
      </a>
      <h1>{paid ? "Ödeme dekontu" : "Ödeme sonucu"}</h1>
    </header>
  );

  let body: React.ReactNode;

  if (pending) {
    body = (
      <div className={flow.state} role="status">
        <span className={flow.spinner} aria-hidden="true" />
        <strong>Ödeme onaylanıyor</strong>
        <span>Bankanızdan sonuç bekleniyor. Bu sayfa kendiliğinden yenilenecek.</span>
      </div>
    );
  } else if (!paid) {
    const cancelled = tx.message === CANCELLED_MESSAGE;
    body = (
      <div className={flow.state} role="alert">
        <span className={`${flow.stateIcon} ${flow.stateIconDanger}`}>
          <AuroraIcon name="alert" size={24} />
        </span>
        <strong>{cancelled ? "Ödeme iptal edildi" : "Ödeme tamamlanamadı"}</strong>
        <span>{cancelled ? "Kartınızdan para çekilmedi." : tx.message || "Kartınızdan para çekilmedi."}</span>
        <a className={flow.ctaInline} href={payHref}>
          Tekrar dene
        </a>
      </div>
    );
  } else {
    body = (
      <>
        <article className={styles.receipt} aria-labelledby="dekont-baslik">
          <div className={styles.receiptHead}>
            <span className={styles.okBadge}>
              <AuroraIcon name="check" size={14} />
              Ödeme başarılı
            </span>
            <strong id="dekont-baslik">{restaurant.name}</strong>
            {restaurant.address && <span>{restaurant.address}</span>}
            <span>Ödeme dekontu</span>
          </div>

          <dl className={styles.facts}>
            <div>
              <dt>Tarih</dt>
              <dd>{formatDate(tx.completed_at ?? tx.created_at)}</dd>
            </div>
            {tableNumber && (
              <div>
                <dt>Masa</dt>
                <dd>{tableNumber}</dd>
              </div>
            )}
            <div>
              <dt>Ödeme</dt>
              <dd>
                {providerName}
                {tx.card_last4 ? ` · •••• ${tx.card_last4}` : ""}
                {tx.mode === "test" ? " · TEST" : ""}
              </dd>
            </div>
            <div>
              <dt>İşlem no</dt>
              <dd>{tx.reference}</dd>
            </div>
          </dl>

          {tx.split_mode === "equal" && tx.split_of ? (
            <ul className={flow.lines}>
              <li>
                <span>
                  Hesabın {tx.split_of} eşit payından {tx.split_parts ?? 1} pay
                </span>
                <span>{formatLira(billPart)}</span>
              </li>
            </ul>
          ) : lines.length > 0 ? (
            <ul className={flow.lines}>
              {lines.map((line, index) => (
                <li key={`${line.name}-${index}`}>
                  <span>
                    <b>{unitsLabel(line.units)}×</b>
                    {line.name}
                  </span>
                  <span>{formatLira(line.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <dl className={styles.totals}>
            <div>
              <dt>Hesap payı</dt>
              <dd>{formatLira(billPart)}</dd>
            </div>
            {tip > 0 && (
              <div>
                <dt>Bahşiş</dt>
                <dd>{formatLira(tip)}</dd>
              </div>
            )}
            <div className={styles.grand}>
              <dt>Toplam ödenen</dt>
              <dd>{formatLira(Number(tx.amount))}</dd>
            </div>
          </dl>

          <p className={styles.disclaimer}>
            Bu belge ödemenizin alındığını gösterir; mali değeri olan fiş veya fatura yerine geçmez. Fişinizi
            işletmeden isteyebilirsiniz.
          </p>
        </article>

        {sessionClosed && (
          <p className={`${styles.notice} ${styles.noPrint}`} role="status">
            <AuroraIcon name="check" size={16} />
            Masanın hesabı tamamen ödendi. Afiyet olsun!
          </p>
        )}

        <div className={`${styles.actions} ${styles.noPrint}`}>
          <PrintButton className={flow.ghost} />
          <a className={flow.ghost} href={billHref}>
            <AuroraIcon name="receipt" size={16} />
            Masa hesabı
          </a>
        </div>
      </>
    );
  }

  return (
    <div className={`${palette.shell} ${auroraFontVariables}`} data-palette={auroraPalette ?? undefined}>
      <div className={flow.page}>
        <div className={flow.column}>
          {header}
          {body}
        </div>
      </div>
      <ReceiptWatcher slug={restaurant.slug} reference={tx.reference} pending={pending} />
    </div>
  );
}
