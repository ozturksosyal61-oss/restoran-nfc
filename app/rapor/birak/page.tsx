import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { findReportSubscription, stopWeeklyReport } from "../../../lib/report-unsubscribe";

export const metadata: Metadata = {
  title: "Haftalık rapor",
  robots: { index: false },
};

// E-postadaki "Haftalık raporu almak istemiyorum" bağlantısı. Bağlantıyı
// otomatik açan e-posta tarayıcıları yanlışlıkla çıkış yapmasın diye
// onay düğmesi vardır.

async function confirmStop(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const done = await stopWeeklyReport(token);
  redirect(`/rapor/birak?t=${encodeURIComponent(token)}&durum=${done ? "tamam" : "hata"}`);
}

const box = {
  maxWidth: 440,
  margin: "64px auto",
  padding: "28px 22px",
  borderRadius: 16,
  background: "#fffdf8",
  border: "1px solid #e6dfd1",
  color: "#1c1914",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  lineHeight: 1.55,
} as const;

export default async function StopReportPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; durum?: string }>;
}) {
  const { t, durum } = await searchParams;
  const subscription = await findReportSubscription(t);

  return (
    <main style={{ minHeight: "100vh", padding: "0 16px", background: "#f3efe7", overflow: "hidden" }}>
      <section style={box}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#a8792a" }}>
          OZT Digital · Haftalık rapor
        </p>

        {!subscription ? (
          <>
            <h1 style={{ margin: "10px 0 6px", fontSize: 22 }}>Bağlantı geçersiz</h1>
            <p style={{ margin: 0, color: "#6f675a" }}>
              Raporu panelinizdeki Dönem özeti sayfasından da kapatabilirsiniz.
            </p>
          </>
        ) : durum === "tamam" || !subscription.enabled ? (
          <>
            <h1 style={{ margin: "10px 0 6px", fontSize: 22 }}>Rapor kapatıldı</h1>
            <p style={{ margin: 0, color: "#6f675a" }}>
              {subscription.name} için haftalık rapor e-postası artık gönderilmeyecek. İstediğiniz zaman
              panelinizdeki Dönem özeti sayfasından yeniden açabilirsiniz.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ margin: "10px 0 6px", fontSize: 22 }}>Haftalık raporu kapat</h1>
            <p style={{ margin: "0 0 18px", color: "#6f675a" }}>
              {subscription.name} için her pazartesi gönderilen rapor e-postası durdurulsun mu?
            </p>
            {durum === "hata" && (
              <p style={{ margin: "0 0 14px", color: "#b4442c" }}>İşlem yapılamadı, lütfen tekrar deneyin.</p>
            )}
            <form action={confirmStop}>
              <input type="hidden" name="t" value={t} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  minHeight: 48,
                  border: 0,
                  borderRadius: 12,
                  background: "#16140f",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Evet, raporu kapat
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
