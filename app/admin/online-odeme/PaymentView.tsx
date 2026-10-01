import type { ReactNode } from "react";
import { PROVIDERS, TEST_AMOUNT } from "../../../lib/payments/providers";
import { ENCRYPTION_KEY_MISSING_MESSAGE } from "../../../lib/payments/crypto";
import {
  PAYMENT_TABLES_MISSING_MESSAGE,
  type PaymentSettings,
  type PaymentTransaction,
} from "../../../lib/payments/service";
import AdminIcon from "../AdminIcon";
import { EnableForm, PendingRefresher, RemoveSettingsForm, SettingsForm, TestPaymentForm } from "./PaymentForms";

const SPLIT_TEXT: Record<string, string> = { full: "Hesabın tamamı", items: "Kendi ürünleri", equal: "Eşit pay" };

function lira(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

const STATUS_TEXT: Record<PaymentTransaction["status"], { label: string; tone: string }> = {
  pending: { label: "Bekliyor", tone: "s-pending" },
  success: { label: "Başarılı", tone: "s-ok" },
  refunded: { label: "Başarılı · iade edildi", tone: "s-ok" },
  failed: { label: "Başarısız", tone: "s-danger" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TestResult({ tx }: { tx: PaymentTransaction }) {
  if (tx.status === "pending") {
    return (
      <p className="adm-alert adm-alert-info" role="status">
        <AdminIcon name="clock" size={16} />
        Test ödemesinin sonucu bekleniyor. Ödeme sayfasını tamamladıysanız sonuç birkaç saniye içinde burada görünür.
        <PendingRefresher />
      </p>
    );
  }
  if (tx.status === "failed") {
    return (
      <p className="adm-alert adm-alert-error" role="alert">
        <AdminIcon name="alert" size={16} />
        Test ödemesi başarısız: {tx.message || "Ödeme tamamlanmadı."}
      </p>
    );
  }
  return (
    <p className="adm-alert adm-alert-ok" role="status">
      <AdminIcon name="check" size={16} />
      Bağlantı çalışıyor. {tx.message}
      {tx.card_last4 ? ` Kart: •••• ${tx.card_last4}.` : ""}
    </p>
  );
}

// Online ödeme ayar sayfasının görünümü; veri page.tsx içinde yüklenir.
export default function PaymentView({
  header,
  keyReady,
  tablesMissing,
  settings,
  history,
  bills,
  current,
  notificationUrl,
}: {
  header: ReactNode;
  keyReady: boolean;
  tablesMissing: boolean;
  settings: PaymentSettings | null;
  history: PaymentTransaction[];
  bills: PaymentTransaction[];
  current: PaymentTransaction | null;
  notificationUrl: string;
}) {
  const provider = settings ? PROVIDERS[settings.provider] : null;
  const card = provider?.testCard;

  return (
    <main className="adm-page">
      {header}

      {!keyReady && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {ENCRYPTION_KEY_MISSING_MESSAGE}
        </p>
      )}
      {tablesMissing && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {PAYMENT_TABLES_MISSING_MESSAGE}
        </p>
      )}

      {current && current.kind === "test" && <TestResult tx={current} />}

      <section className="adm-card" aria-labelledby="pay-durum">
        <div className="adm-card-head">
          <div>
            <h2 id="pay-durum">Bağlantı durumu</h2>
            <p>
              {settings
                ? settings.verified_at
                  ? `Son başarılı test: ${formatDate(settings.verified_at)}`
                  : "Bilgiler kayıtlı ama henüz test edilmedi. Aşağıdan 1 ₺'lik test ödemesi yapın."
                : "Henüz bir ödeme sağlayıcısı bağlanmadı."}
            </p>
          </div>
        </div>
        <div className="adm-pay-status">
          {settings && provider ? (
            <>
              <span className="adm-badge s-accent">{provider.name}</span>
              <span className={`adm-badge ${settings.mode === "live" ? "s-ok" : "s-pending"}`}>
                {settings.mode === "live" ? "Canlı mod" : "Test modu"}
              </span>
              <span className={`adm-badge is-dot ${settings.verified_at ? "s-ok" : "s-danger"}`}>
                {settings.verified_at ? "Doğrulandı" : "Doğrulanmadı"}
              </span>
            </>
          ) : (
            <span className="adm-badge is-dot">Bağlı değil</span>
          )}
          {settings && (
            <span className={`adm-badge is-dot ${settings.is_enabled ? "s-ok" : ""}`}>
              {settings.is_enabled ? "Müşterilere açık" : "Müşterilere kapalı"}
            </span>
          )}
        </div>
      </section>

      {settings && (
        <section className="adm-card" aria-labelledby="pay-musteri">
          <div className="adm-card-head">
            <div>
              <h2 id="pay-musteri">Masadan kartla ödeme</h2>
              <p>
                Açıkken müşteriler masa hesabı ekranında “Kartla öde” düğmesini görür. Hesabın tamamını, yalnızca
                kendi ürünlerini ya da eşit payını ödeyebilir, isterse bahşiş ekleyebilir. Hesap tamamen ödenince
                siparişler “ödendi (online)” olur ve masa hesabı kapanır.
                {!settings.verified_at && " Açabilmek için önce başarılı bir test ödemesi yapın."}
              </p>
            </div>
          </div>
          {settings.is_enabled && settings.mode === "test" && (
            <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
              <AdminIcon name="info" size={16} />
              Test modundasınız: müşteriler gerçek kartla ödeme yapamaz. Denemeleriniz bittiğinde canlı anahtarlarınızı
              girip canlı moda geçin.
            </p>
          )}
          <EnableForm enabled={settings.is_enabled} verified={Boolean(settings.verified_at)} />
        </section>
      )}

      <section className="adm-card" aria-labelledby="pay-bilgiler">
        <div className="adm-card-head">
          <div>
            <h2 id="pay-bilgiler">Sağlayıcı bilgileri</h2>
            <p>
              API anahtarları şifrelenerek saklanır ve kaydedildikten sonra ekranda bir daha gösterilmez. Bilgileri
              değiştirdiğinizde bağlantı yeniden test edilene kadar doğrulanmamış sayılır.
            </p>
          </div>
        </div>
        <SettingsForm
          key={settings?.updated_at ?? "yeni"}
          savedProvider={settings?.provider ?? null}
          savedMode={settings?.mode ?? "test"}
          hints={settings?.credentials_hint ?? {}}
          notificationUrl={notificationUrl}
        />
      </section>

      <section className="adm-card" aria-labelledby="pay-test">
        <div className="adm-card-head">
          <div>
            <h2 id="pay-test">Bağlantı testi</h2>
            <p>
              {TEST_AMOUNT} ₺&apos;lik bir ödeme başlatılır ve sağlayıcının ödeme sayfası açılır. Ödeme bitince bu
              sayfaya dönersiniz ve sonucu görürsünüz.
            </p>
          </div>
        </div>

        {settings?.mode === "live" && (
          <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
            <AdminIcon name="info" size={16} />
            Canlı moddasınız: kendi kartınızdan gerçekten {TEST_AMOUNT} ₺ çekilir ve hemen iade edilir. İadenin
            kartınıza yansıması bankanıza göre birkaç gün sürebilir.
          </p>
        )}

        {settings?.mode === "test" && provider && card && (
          <div className="adm-pay-card" aria-label="Test kartı">
            <span className="adm-label">{provider.testHelp} Test kartı:</span>
            <dl>
              <div><dt>Kart no</dt><dd className="adm-num">{card.number}</dd></div>
              <div><dt>Son kullanma</dt><dd className="adm-num">{card.expiry}</dd></div>
              <div><dt>CVC</dt><dd className="adm-num">{card.cvc}</dd></div>
            </dl>
            <span className="adm-hint">
              3D doğrulama ekranında istenen kodu sağlayıcının test sayfası gösterir. Sağlayıcınız test kartlarını
              değiştirdiyse kendi panelindeki güncel kartları kullanın.
            </span>
          </div>
        )}

        <TestPaymentForm disabled={!settings || !keyReady || tablesMissing} />
      </section>

      {history.length > 0 && (
        <section className="adm-card" aria-labelledby="pay-gecmis">
          <div className="adm-card-head">
            <div>
              <h2 id="pay-gecmis">Son testler</h2>
            </div>
          </div>
          <ul className="adm-pay-history">
            {history.map((tx) => (
              <li key={tx.id}>
                <div>
                  <strong>
                    {PROVIDERS[tx.provider]?.name ?? tx.provider} · {tx.mode === "live" ? "Canlı" : "Test"}
                  </strong>
                  <span className="adm-hint">{formatDate(tx.created_at)}{tx.message ? ` · ${tx.message}` : ""}</span>
                </div>
                <span className={`adm-badge ${STATUS_TEXT[tx.status].tone}`}>{STATUS_TEXT[tx.status].label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bills.length > 0 && (
        <section className="adm-card" aria-labelledby="pay-masa">
          <div className="adm-card-head">
            <div>
              <h2 id="pay-masa">Son masa ödemeleri</h2>
              <p>Müşterilerin masadan kartla yaptığı son ödemeler.</p>
            </div>
          </div>
          <ul className="adm-pay-history">
            {bills.map((tx) => {
              const tip = Number(tx.tip_amount ?? 0);
              const split = tx.split_mode === "equal" && tx.split_of
                ? `${tx.split_of} kişiye bölündü, ${tx.split_parts ?? 1} pay`
                : SPLIT_TEXT[tx.split_mode ?? ""] ?? "";
              return (
                <li key={tx.id}>
                  <div>
                    <strong>
                      {lira(Number(tx.amount))}
                      {tip > 0 ? ` (bahşiş ${lira(tip)})` : ""}
                    </strong>
                    <span className="adm-hint">
                      {formatDate(tx.created_at)}
                      {split ? ` · ${split}` : ""}
                      {tx.mode === "test" ? " · Test" : ""}
                      {tx.status === "failed" && tx.message ? ` · ${tx.message}` : ""}
                    </span>
                  </div>
                  <span className={`adm-badge ${STATUS_TEXT[tx.status].tone}`}>
                    {tx.status === "refunded" ? "İade edildi" : STATUS_TEXT[tx.status].label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {settings && (
        <section className="adm-card" aria-labelledby="pay-kaldir">
          <div className="adm-card-head">
            <div>
              <h2 id="pay-kaldir">Bağlantıyı kaldır</h2>
              <p>Kayıtlı API anahtarları silinir. Online ödeme alınamaz; geçmiş test kayıtları kalır.</p>
            </div>
          </div>
          <RemoveSettingsForm />
        </section>
      )}
    </main>
  );
}
