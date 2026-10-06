import Link from "next/link";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import AdminIcon from "../../admin/AdminIcon";
import {
  BUSINESS_TYPES,
  INTERESTS,
  LEAD_COLUMNS,
  OPEN_STAGES,
  STAGES,
  endOfTodayIstanbul,
  formatDay,
  interestOf,
  labelOf,
  stageOf,
  telLink,
  type Lead,
} from "../../../lib/sales";
import "./saha.css";

export const dynamic = "force-dynamic";

type Search = { asama?: string; ilgi?: string; semt?: string; q?: string };

function requestTime() {
  return Date.now();
}

function filterHref(current: Search, change: Partial<Search>) {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/sistem/saha?${query}` : "/sistem/saha";
}

export default async function FieldSalesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSystemAdmin();
  const search = await searchParams;
  const admin = createSupabaseAdminClient();
  const now = requestTime();

  const [{ data: leadRows, error }, { data: visitRows }] = await Promise.all([
    admin.from("sales_leads").select(LEAD_COLUMNS).order("updated_at", { ascending: false }).limit(1000),
    admin.from("sales_visits").select("lead_id, created_at").neq("channel", "sistem").order("created_at", { ascending: false }).limit(3000),
  ]);

  if (error) {
    return (
      <main className="adm-page">
        <header className="adm-head">
          <div className="adm-head-text">
            <span className="adm-eyebrow">Satış</span>
            <h1>Saha satış</h1>
          </div>
        </header>
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Saha satış tabloları bulunamadı. 20261019_field_sales.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.
        </p>
      </main>
    );
  }

  const leads = (leadRows ?? []) as unknown as Lead[];
  const lastVisit = new Map<number, string>();
  for (const visit of visitRows ?? []) {
    if (!lastVisit.has(Number(visit.lead_id))) lastVisit.set(Number(visit.lead_id), String(visit.created_at));
  }

  // Bugün yapılacaklar: takip zamanı bugün bitene kadar gelmiş açık adaylar.
  const todayEnd = endOfTodayIstanbul(new Date(now)).getTime();
  const followUps = leads
    .filter((lead) => lead.next_action_at && OPEN_STAGES.includes(lead.stage))
    .filter((lead) => new Date(lead.next_action_at!).getTime() <= todayEnd)
    .sort((a, b) => new Date(a.next_action_at!).getTime() - new Date(b.next_action_at!).getTime());

  const districts = [...new Set(leads.map((lead) => lead.district?.trim()).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  const query = search.q?.trim().toLocaleLowerCase("tr-TR") ?? "";
  const filtered = leads.filter((lead) => {
    if (search.asama === "acik" ? !OPEN_STAGES.includes(lead.stage) : search.asama && lead.stage !== search.asama) return false;
    if (search.ilgi && lead.interest !== search.ilgi) return false;
    if (search.semt && lead.district?.trim() !== search.semt) return false;
    if (query) {
      const haystack = [lead.name, lead.contact_name, lead.district, lead.phone, lead.instagram]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const stageCounts = new Map<string, number>();
  for (const lead of leads) stageCounts.set(lead.stage, (stageCounts.get(lead.stage) ?? 0) + 1);
  const openCount = leads.filter((lead) => OPEN_STAGES.includes(lead.stage)).length;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Satış</span>
          <h1>Saha satış</h1>
          <p>Ziyaret ettiğiniz işletmeler, görüşme notları ve takipler. Telefonda kullanmak için tasarlandı.</p>
        </div>
        <div className="saha-actions">
          <Link href="/sistem/saha/yeni" className="adm-btn adm-btn-primary">
            <AdminIcon name="plus" size={16} />
            Yeni işletme
          </Link>
          <Link href="/sistem/saha/istatistik" className="adm-btn">
            <AdminIcon name="chart" size={16} />
            İstatistikler
          </Link>
        </div>
      </header>

      {/* BUGÜN YAPILACAKLAR */}
      <section className="adm-card" aria-labelledby="bugun">
        <div className="adm-card-head">
          <div>
            <h2 id="bugun">Bugün yapılacaklar</h2>
            <p>
              {followUps.length > 0
                ? `${followUps.length} takip bekliyor. Gecikenler kırmızı.`
                : "Bugün için takip yok. Görüşme eklerken “Tekrar uğra / ara” tarihi koyabilirsiniz."}
            </p>
          </div>
        </div>
        {followUps.length > 0 && (
          <div className="saha-today">
            {followUps.map((lead) => {
              const late = new Date(lead.next_action_at!).getTime() < now;
              const tel = telLink(lead.phone);
              return (
                <div key={lead.id} className={`saha-follow ${late ? "is-late" : ""}`}>
                  <Link href={`/sistem/saha/${lead.id}`} className="saha-follow-main">
                    <strong>{lead.name}</strong>
                    <span className="saha-follow-when">
                      {late ? "Gecikti · " : ""}
                      {formatDay(lead.next_action_at)}
                    </span>
                    {lead.next_action && <span>{lead.next_action}</span>}
                  </Link>
                  <div className="saha-follow-buttons">
                    {tel && (
                      <a href={tel} className="adm-btn adm-btn-sm" aria-label={`${lead.name} ara`}>
                        <AdminIcon name="phone" size={15} />
                        Ara
                      </a>
                    )}
                    <Link href={`/sistem/saha/${lead.id}#gorusme`} className="adm-btn adm-btn-sm adm-btn-primary">
                      <AdminIcon name="edit" size={15} />
                      Not ekle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FİLTRELER */}
      <section className="saha-filters" aria-label="Filtreler">
        <nav className="adm-chips" aria-label="Aşama">
          <Link href={filterHref(search, { asama: undefined })} className={`adm-chip ${!search.asama ? "is-active" : ""}`}>
            Tümü <b>{leads.length}</b>
          </Link>
          <Link href={filterHref(search, { asama: "acik" })} className={`adm-chip ${search.asama === "acik" ? "is-active" : ""}`}>
            Açık <b>{openCount}</b>
          </Link>
          {STAGES.map((stage) => (
            <Link
              key={stage.value}
              href={filterHref(search, { asama: stage.value })}
              className={`adm-chip ${search.asama === stage.value ? "is-active" : ""}`}
            >
              {stage.label} <b>{stageCounts.get(stage.value) ?? 0}</b>
            </Link>
          ))}
        </nav>
        <nav className="adm-chips" aria-label="İlgi">
          <Link href={filterHref(search, { ilgi: undefined })} className={`adm-chip ${!search.ilgi ? "is-active" : ""}`}>
            Her ilgi
          </Link>
          {INTERESTS.map((interest) => (
            <Link
              key={interest.value}
              href={filterHref(search, { ilgi: interest.value })}
              className={`adm-chip ${search.ilgi === interest.value ? "is-active" : ""}`}
            >
              <span className={`saha-dot ${interest.value}`} aria-hidden="true" /> {interest.label}
            </Link>
          ))}
        </nav>
        <form className="saha-search" action="/sistem/saha">
          {search.asama && <input type="hidden" name="asama" value={search.asama} />}
          {search.ilgi && <input type="hidden" name="ilgi" value={search.ilgi} />}
          <select name="semt" className="adm-select" defaultValue={search.semt ?? ""} aria-label="Semt">
            <option value="">Tüm semtler</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          <input
            name="q"
            type="search"
            className="adm-input"
            defaultValue={search.q ?? ""}
            placeholder="İşletme, kişi, telefon ara"
            aria-label="Ara"
          />
          <button type="submit" className="adm-btn">
            <AdminIcon name="search" size={16} />
            Filtrele
          </button>
        </form>
      </section>

      {/* LİSTE */}
      {filtered.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name="store" />
          </span>
          <strong>{leads.length === 0 ? "Henüz işletme yok" : "Bu filtreye uyan işletme yok"}</strong>
          <p>
            {leads.length === 0
              ? "İlk ziyaretinizden sonra “Yeni işletme” ile kaydedin; görüşme notlarınız ve takipleriniz burada toplanır."
              : "Filtreleri değiştirin ya da temizleyin."}
          </p>
        </div>
      ) : (
        <div className="saha-list">
          {filtered.map((lead) => {
            const stage = stageOf(lead.stage);
            const interest = interestOf(lead.interest);
            const visited = lastVisit.get(lead.id);
            return (
              <Link key={lead.id} href={`/sistem/saha/${lead.id}`} className="saha-lead">
                <span className="saha-lead-name">
                  {interest && <span className={`saha-dot ${interest.value}`} title={`İlgi: ${interest.label}`} />}
                  {lead.name}
                </span>
                <span className={`adm-badge ${stage.tone}`}>{stage.label}</span>
                <span className="saha-lead-meta">
                  <span>{labelOf(BUSINESS_TYPES, lead.business_type)}</span>
                  {lead.district && <span>{lead.district}</span>}
                  {lead.contact_name && <span>{lead.contact_name}</span>}
                  <span>{visited ? `Son görüşme: ${formatDay(visited)}` : "Görüşme yok"}</span>
                  {lead.next_action_at && OPEN_STAGES.includes(lead.stage) && (
                    <span>Takip: {formatDay(lead.next_action_at)}</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
