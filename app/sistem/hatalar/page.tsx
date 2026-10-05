import Link from "next/link";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import AdminIcon from "../../admin/AdminIcon";
import { clearResolvedAction, resolveErrorAction } from "./actions";

export const dynamic = "force-dynamic";

type ErrorRow = {
  id: number;
  source: "server" | "client";
  message: string;
  stack: string | null;
  path: string | null;
  route: string | null;
  digest: string | null;
  user_agent: string | null;
  occurrences: number;
  first_seen: string;
  last_seen: string;
  resolved_at: string | null;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "3 dk önce", "2 sa önce", "4 gün önce"
function ago(value: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.round(hours / 24)} gün önce`;
}

// Sayfa her istekte sunucuda yeniden hesaplanır.
function requestTime() {
  return Date.now();
}

function device(userAgent: string | null) {
  if (!userAgent) return null;
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS/.test(userAgent)
          ? "macOS"
          : null;
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Safari\//.test(userAgent)
        ? "Safari"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : null;
  return [os, browser].filter(Boolean).join(" · ") || null;
}

export default async function ErrorLogPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireSystemAdmin();
  const { durum } = await searchParams;
  const showResolved = durum === "cozulen";
  const now = requestTime();

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("error_logs")
    .select("id, source, message, stack, path, route, digest, user_agent, occurrences, first_seen, last_seen, resolved_at")
    .order("last_seen", { ascending: false })
    .limit(200);
  query = showResolved ? query.not("resolved_at", "is", null) : query.is("resolved_at", null);

  const [{ data, error }, openCount, dayCount] = await Promise.all([
    query,
    admin.from("error_logs").select("id", { count: "exact", head: true }).is("resolved_at", null),
    admin
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("last_seen", new Date(now - 86_400_000).toISOString()),
  ]);

  const rows = (data ?? []) as ErrorRow[];
  const missingTable = Boolean(error);
  const open = openCount.count ?? 0;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Yönetim</span>
          <h1>Hatalar</h1>
          <p>
            Sitede, menülerde ve panellerde oluşan hatalar burada toplanır. Aynı hata tek satırda sayılır. Kişisel veri
            kaydedilmez, kayıtlar 90 gün sonra silinir.
          </p>
        </div>
        {!missingTable && (
          <span className={`adm-badge is-dot ${open > 0 ? "s-danger" : "s-ok"}`}>{open} açık hata</span>
        )}
      </header>

      {missingTable ? (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Hata kayıtları tablosu bulunamadı. 20261018_error_logs_legal.sql dosyasını Supabase SQL Editor&apos;da
          çalıştırın.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <nav className="adm-chips" aria-label="Hata durumu">
              <Link href="/sistem/hatalar" className={`adm-chip ${showResolved ? "" : "is-active"}`}>
                Açık <b>{open}</b>
              </Link>
              <Link href="/sistem/hatalar?durum=cozulen" className={`adm-chip ${showResolved ? "is-active" : ""}`}>
                Çözülenler
              </Link>
            </nav>
            <span className="adm-muted" style={{ fontSize: 13 }}>
              Son 24 saatte {dayCount.count ?? 0} farklı hata görüldü.
            </span>
            {showResolved && rows.length > 0 && (
              <form action={clearResolvedAction} style={{ marginInlineStart: "auto" }}>
                <button type="submit" className="adm-btn adm-btn-sm adm-btn-ghost adm-text-danger">
                  <AdminIcon name="trash" size={15} />
                  Çözülenleri sil
                </button>
              </form>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon">
                <AdminIcon name="check" />
              </span>
              <strong>{showResolved ? "Çözülmüş hata yok" : "Açık hata yok"}</strong>
              <p>
                {showResolved
                  ? "Çözüldü olarak işaretlediğiniz hatalar burada görünür."
                  : "Her şey yolunda görünüyor. Yeni bir hata olursa burada en üstte görünür."}
              </p>
            </div>
          ) : (
            <div className="adm-reviews">
              {rows.map((row) => (
                <article key={row.id} className="adm-card" style={{ gap: 10, padding: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <span className={`adm-badge ${row.source === "server" ? "s-danger" : "s-pending"}`}>
                      {row.source === "server" ? "Sunucu" : "Tarayıcı"}
                    </span>
                    <strong style={{ flex: "1 1 260px", minWidth: 0, overflowWrap: "anywhere", fontSize: 14.5 }}>
                      {row.message.split("\n")[0]}
                    </strong>
                    <span className="adm-badge s-accent" title="Kaç kez görüldü">
                      {row.occurrences.toLocaleString("tr-TR")} kez
                    </span>
                  </div>

                  <div
                    className="adm-muted"
                    style={{ display: "flex", gap: "4px 16px", flexWrap: "wrap", fontSize: 12.5, overflowWrap: "anywhere" }}
                  >
                    {row.path && <span>Sayfa: {row.path}</span>}
                    <span>
                      Son: {ago(row.last_seen, now)} ({formatTime(row.last_seen)})
                    </span>
                    <span>İlk: {formatTime(row.first_seen)}</span>
                    {device(row.user_agent) && <span>{device(row.user_agent)}</span>}
                  </div>

                  {(row.stack || row.route || row.digest) && (
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 13 }}>Teknik ayrıntı</summary>
                      <pre
                        style={{
                          margin: "8px 0 0",
                          padding: 12,
                          maxHeight: 280,
                          overflow: "auto",
                          borderRadius: 10,
                          background: "var(--a-sunken)",
                          fontSize: 11.5,
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {[row.route && `Kaynak: ${row.route}`, row.digest && `Kod: ${row.digest}`, row.stack]
                          .filter(Boolean)
                          .join("\n\n")}
                      </pre>
                    </details>
                  )}

                  <form action={resolveErrorAction} style={{ display: "flex", justifyContent: "flex-end" }}>
                    <input type="hidden" name="id" value={row.id} />
                    {row.resolved_at && <input type="hidden" name="reopen" value="1" />}
                    <button type="submit" className="adm-btn adm-btn-sm">
                      <AdminIcon name={row.resolved_at ? "refresh" : "check"} size={15} />
                      {row.resolved_at ? "Yeniden aç" : "Çözüldü"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
