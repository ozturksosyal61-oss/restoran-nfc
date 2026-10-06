import Link from "next/link";
import { requireSystemAdmin } from "../../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import AdminIcon from "../../../admin/AdminIcon";
import { LOST_REASONS, OPEN_STAGES, STAGES } from "../../../../lib/sales";
import "../saha.css";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function requestTime() {
  return Date.now();
}

// İstanbul saatine göre haftanın pazartesisi (gün başlangıcı, UTC zaman damgası).
function weekStart(time: number) {
  const local = new Date(time + 3 * 3_600_000);
  const day = (local.getUTCDay() + 6) % 7;
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day);
  return monday - 3 * 3_600_000;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="saha-bars">
      {rows.map((row) => (
        <div key={row.label} className="saha-bar">
          <span>{row.label}</span>
          <span className="saha-bar-track" aria-hidden="true">
            <span className="saha-bar-fill" style={{ width: `${(row.value / max) * 100}%`, display: "block" }} />
          </span>
          <b>{row.value}</b>
        </div>
      ))}
    </div>
  );
}

export default async function FieldSalesStatsPage() {
  await requireSystemAdmin();
  const admin = createSupabaseAdminClient();
  const now = requestTime();

  const [{ data: leadRows, error }, { data: visitRows }] = await Promise.all([
    admin.from("sales_leads").select("id, stage, lost_reason, district, demo_restaurant_id"),
    admin
      .from("sales_visits")
      .select("lead_id, created_at")
      .neq("channel", "sistem")
      .gte("created_at", new Date(weekStart(now) - 7 * 7 * DAY).toISOString()),
  ]);

  const leads = leadRows ?? [];
  const visits = visitRows ?? [];

  const won = leads.filter((lead) => lead.stage === "kazanildi").length;
  const lost = leads.filter((lead) => lead.stage === "kaybedildi").length;
  const open = leads.filter((lead) => OPEN_STAGES.includes(lead.stage)).length;
  const demos = leads.filter((lead) => lead.demo_restaurant_id != null || lead.stage === "demo").length;
  const thisWeek = visits.filter((visit) => new Date(visit.created_at).getTime() >= weekStart(now)).length;

  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = weekStart(now) - (7 - index) * 7 * DAY;
    const end = start + 7 * DAY;
    const count = visits.filter((visit) => {
      const time = new Date(visit.created_at).getTime();
      return time >= start && time < end;
    }).length;
    const label = new Date(start + 3 * 3_600_000).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
    return { label, count };
  });
  const maxWeek = Math.max(1, ...weeks.map((week) => week.count));

  const stageRows = STAGES.map((stage) => ({
    label: stage.label,
    value: leads.filter((lead) => lead.stage === stage.value).length,
  }));

  const lostRows = LOST_REASONS.map((reason) => ({
    label: reason.label,
    value: leads.filter((lead) => lead.stage === "kaybedildi" && lead.lost_reason === reason.value).length,
  }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const districtMap = new Map<string, { total: number; won: number }>();
  for (const lead of leads) {
    const key = lead.district?.trim() || "Semt yok";
    const entry = districtMap.get(key) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (lead.stage === "kazanildi") entry.won += 1;
    districtMap.set(key, entry);
  }
  const districts = [...districtMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 10);

  return (
    <main className="adm-page">
      <Link href="/sistem/saha" className="adm-back">
        <AdminIcon name="arrowLeft" size={15} />
        Saha satış
      </Link>
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Saha satış</span>
          <h1>İstatistikler</h1>
          <p>Ziyaretleriniz ne kadar satışa dönüyor, en çok neden kaybediyorsunuz?</p>
        </div>
      </header>

      {error ? (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Saha satış tabloları bulunamadı. 20261019_field_sales.sql dosyasını çalıştırın.
        </p>
      ) : (
        <>
          <div className="saha-stats">
            <div className="saha-stat">
              <span>Bu hafta görüşme</span>
              <strong>{thisWeek}</strong>
            </div>
            <div className="saha-stat">
              <span>Toplam işletme</span>
              <strong>{leads.length}</strong>
            </div>
            <div className="saha-stat">
              <span>Açık aday</span>
              <strong>{open}</strong>
            </div>
            <div className="saha-stat">
              <span>Demo kurulan</span>
              <strong>{demos}</strong>
            </div>
            <div className="saha-stat">
              <span>Kazanılan</span>
              <strong>{won}</strong>
            </div>
            <div className="saha-stat">
              <span>Kapanan satış oranı</span>
              <strong>%{percent(won, won + lost)}</strong>
            </div>
          </div>
          <p className="adm-hint" style={{ margin: 0 }}>
            Kapanan satış oranı: kazanılan ÷ (kazanılan + kaybedilen). Demo kurulanların %{percent(won, demos)}&apos;i
            kazanıldı.
          </p>

          <section className="adm-card" aria-labelledby="haftalik">
            <div className="adm-card-head">
              <div>
                <h2 id="haftalik">Haftalık görüşme sayısı</h2>
                <p>Son 8 hafta (pazartesi başlangıçlı)</p>
              </div>
            </div>
            <div className="saha-weeks">
              {weeks.map((week) => (
                <div key={week.label} className="saha-week">
                  <b>{week.count}</b>
                  <div className="saha-week-bar" style={{ height: `${(week.count / maxWeek) * 100}%` }} />
                  <span>{week.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="saha-detail">
            <section className="adm-card" aria-labelledby="asamalar">
              <div className="adm-card-head">
                <div>
                  <h2 id="asamalar">Aşamalara göre</h2>
                </div>
              </div>
              <Bars rows={stageRows} />
            </section>

            <section className="adm-card" aria-labelledby="kayip">
              <div className="adm-card-head">
                <div>
                  <h2 id="kayip">Kaybetme nedenleri</h2>
                  <p>{lost} kaybedilen işletme</p>
                </div>
              </div>
              {lostRows.length > 0 ? <Bars rows={lostRows} /> : <p className="adm-hint">Henüz kaybedilen yok.</p>}
            </section>
          </div>

          <section className="adm-card" aria-labelledby="semtler">
            <div className="adm-card-head">
              <div>
                <h2 id="semtler">Semtler</h2>
                <p>En çok ziyaret edilen 10 semt ve kazanılan işletmeler</p>
              </div>
            </div>
            {districts.length > 0 ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Semt</th>
                      <th scope="col">İşletme</th>
                      <th scope="col">Kazanılan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districts.map(([district, entry]) => (
                      <tr key={district}>
                        <td>
                          {district === "Semt yok" ? (
                            district
                          ) : (
                            <Link href={`/sistem/saha?semt=${encodeURIComponent(district)}`}>{district}</Link>
                          )}
                        </td>
                        <td>{entry.total}</td>
                        <td>{entry.won}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="adm-hint">Henüz kayıt yok.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
