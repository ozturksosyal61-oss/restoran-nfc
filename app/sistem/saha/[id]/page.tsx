import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSystemAdmin } from "../../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { SITE_URL } from "../../../../lib/site";
import AdminIcon from "../../../admin/AdminIcon";
import {
  BUSINESS_TYPES,
  CHANNELS,
  CURRENT_MENUS,
  LEAD_COLUMNS,
  LOST_REASONS,
  OFFER_PLANS,
  OPEN_STAGES,
  formatDay,
  formatLira,
  instagramLink,
  interestOf,
  introMessage,
  labelOf,
  mapsLink,
  stageOf,
  telLink,
  whatsappLink,
  type Lead,
  type Visit,
} from "../../../../lib/sales";
import { completeFollowUp, deleteLead, deletePhoto, deleteVisit } from "../actions";
import {
  ConfirmButton,
  FollowUpForm,
  LeadForm,
  LocationButton,
  OfferForm,
  PhotoUploader,
  StageForm,
  VisitForm,
} from "../SalesForms";
import "../saha.css";

export const dynamic = "force-dynamic";

function requestTime() {
  return Date.now();
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSystemAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const admin = createSupabaseAdminClient();
  const [{ data: leadRow }, { data: visitRows }] = await Promise.all([
    admin.from("sales_leads").select(LEAD_COLUMNS).eq("id", id).maybeSingle(),
    admin
      .from("sales_visits")
      .select("id, lead_id, channel, interest, note, next_step, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!leadRow) notFound();
  const lead = leadRow as unknown as Lead;
  const visits = (visitRows ?? []) as Visit[];
  const now = requestTime();

  // Demo ve dönüştürülen restoran
  const [demoInfo, restaurantInfo, photoUrls] = await Promise.all([
    lead.demo_restaurant_id
      ? Promise.all([
          admin.from("restaurants").select("slug, demo_expires_at").eq("id", lead.demo_restaurant_id).maybeSingle(),
          admin
            .from("restaurant_tables")
            .select("public_token")
            .eq("restaurant_id", lead.demo_restaurant_id)
            .eq("table_number", 1)
            .maybeSingle(),
        ])
      : Promise.resolve(null),
    lead.restaurant_id
      ? admin.from("restaurants").select("id, name").eq("id", lead.restaurant_id).maybeSingle()
      : Promise.resolve(null),
    lead.photos.length > 0
      ? admin.storage.from("sales-photos").createSignedUrls(lead.photos, 3600)
      : Promise.resolve(null),
  ]);

  const demoSlug = demoInfo?.[0].data?.slug as string | undefined;
  const demoToken = demoInfo?.[1].data?.public_token as string | undefined;
  const demoExpires = demoInfo?.[0].data?.demo_expires_at as string | null | undefined;
  const demoUrl = demoSlug
    ? `${SITE_URL}/restoran/${demoSlug}${demoToken ? `?masa=${encodeURIComponent(demoToken)}` : ""}`
    : null;
  const restaurant = restaurantInfo?.data as { id: number; name: string } | null | undefined;
  const photos = (photoUrls?.data ?? [])
    .map((item, index) => ({ path: lead.photos[index], url: item.signedUrl }))
    .filter((item) => item.url);

  const stage = stageOf(lead.stage);
  const interest = interestOf(lead.interest);
  const tel = telLink(lead.phone);
  const whatsapp = whatsappLink(lead.phone, introMessage(lead, demoUrl ?? `${SITE_URL}/demo`));
  const maps = mapsLink(lead);
  const instagram = instagramLink(lead.instagram);
  const open = OPEN_STAGES.includes(lead.stage);
  const followLate = lead.next_action_at ? new Date(lead.next_action_at).getTime() < now : false;

  const convertParams = new URLSearchParams({ aday: String(lead.id), ad: lead.name });
  if (lead.instagram) convertParams.set("instagram", instagram ?? lead.instagram);
  if (lead.table_count) convertParams.set("masa", String(lead.table_count));
  if (lead.offer_plan) convertParams.set("paket", lead.offer_plan);

  return (
    <main className="adm-page">
      <Link href="/sistem/saha" className="adm-back">
        <AdminIcon name="arrowLeft" size={15} />
        Saha satış
      </Link>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">
            {labelOf(BUSINESS_TYPES, lead.business_type)}
            {lead.district ? ` · ${lead.district}` : ""}
          </span>
          <h1>{lead.name}</h1>
          <div className="saha-badges">
            <span className={`adm-badge ${stage.tone}`}>{stage.label}</span>
            {lead.stage === "kaybedildi" && lead.lost_reason && (
              <span className="adm-badge s-delivered">{labelOf(LOST_REASONS, lead.lost_reason)}</span>
            )}
            {interest && <span className={`adm-badge is-dot ${interest.tone}`}>{interest.label}</span>}
          </div>
        </div>
        <div className="saha-actions">
          {tel && (
            <a href={tel} className="adm-btn adm-btn-primary">
              <AdminIcon name="phone" size={16} />
              Ara
            </a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="adm-btn">
              <AdminIcon name="chat" size={16} />
              WhatsApp
            </a>
          )}
          {maps && (
            <a href={maps} target="_blank" rel="noreferrer" className="adm-btn">
              <AdminIcon name="pin" size={16} />
              Haritada aç
            </a>
          )}
          {instagram && (
            <a href={instagram} target="_blank" rel="noreferrer" className="adm-btn">
              <AdminIcon name="external" size={16} />
              Instagram
            </a>
          )}
        </div>
      </header>

      {lead.next_action_at && open && (
        <div className={`saha-follow ${followLate ? "is-late" : ""}`}>
          <div className="saha-follow-main">
            <strong>{followLate ? "Takip gecikti" : "Sıradaki takip"}</strong>
            <span className="saha-follow-when">{formatDay(lead.next_action_at)}</span>
            {lead.next_action && <span>{lead.next_action}</span>}
          </div>
          <form action={completeFollowUp}>
            <input type="hidden" name="id" value={lead.id} />
            <button type="submit" className="adm-btn adm-btn-sm">
              <AdminIcon name="check" size={15} />
              Tamamlandı
            </button>
          </form>
        </div>
      )}

      <div className="saha-detail">
        {/* SOL: görüşmeler */}
        <div className="saha-col">
          <section id="gorusme" className="adm-card" aria-labelledby="gorusme-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="gorusme-baslik">Görüşme ekle</h2>
                <p>Not tarihi otomatik eklenir. Takip tarihi koyarsanız “Bugün yapılacaklar”da çıkar.</p>
              </div>
            </div>
            <VisitForm leadId={lead.id} />
          </section>

          <section className="adm-card" aria-labelledby="gecmis-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="gecmis-baslik">Görüşme geçmişi</h2>
                <p>{visits.filter((visit) => visit.channel !== "sistem").length} görüşme</p>
              </div>
            </div>
            {visits.length === 0 ? (
              <p className="adm-hint" style={{ margin: 0 }}>
                Henüz not yok.
              </p>
            ) : (
              <ol className="saha-timeline">
                {visits.map((visit) => {
                  const visitInterest = interestOf(visit.interest);
                  const system = visit.channel === "sistem";
                  return (
                    <li key={visit.id} className={system ? "is-system" : ""}>
                      <div className="saha-visit-head">
                        <span>{formatDay(visit.created_at)}</span>
                        {!system && <span>{labelOf(CHANNELS, visit.channel)}</span>}
                        {visitInterest && (
                          <span className={`adm-badge is-dot ${visitInterest.tone}`}>{visitInterest.label}</span>
                        )}
                        <form action={deleteVisit} style={{ marginInlineStart: "auto" }}>
                          <input type="hidden" name="id" value={visit.id} />
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <ConfirmButton message="Bu not silinsin mi?" label="Notu sil">
                            <AdminIcon name="trash" size={14} />
                          </ConfirmButton>
                        </form>
                      </div>
                      <div className="saha-visit-note">{visit.note}</div>
                      {visit.next_step && <div className="saha-visit-next">Sonraki adım: {visit.next_step}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* SAĞ: aşama, teklif, demo, fotoğraf, bilgiler */}
        <div className="saha-col">
          <section className="adm-card" aria-labelledby="asama-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="asama-baslik">Satış aşaması</h2>
              </div>
            </div>
            <StageForm lead={lead} />
          </section>

          {!lead.next_action_at && open && (
            <section className="adm-card" aria-labelledby="takip-baslik">
              <div className="adm-card-head">
                <div>
                  <h2 id="takip-baslik">Takip tarihi</h2>
                  <p>Not eklemeden yalnızca hatırlatma koymak için.</p>
                </div>
              </div>
              <FollowUpForm leadId={lead.id} />
            </section>
          )}

          <section className="adm-card" aria-labelledby="teklif-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="teklif-baslik">Teklif</h2>
                <p>
                  {lead.offer_plan
                    ? `${labelOf(OFFER_PLANS, lead.offer_plan)}${lead.offer_price != null ? ` · ${formatLira(lead.offer_price)}` : ""}`
                    : "Önerdiğiniz paket ve konuştuğunuz fiyat."}
                </p>
              </div>
            </div>
            <OfferForm lead={lead} />
          </section>

          <section className="adm-card" aria-labelledby="demo-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="demo-baslik">Demo ve hesap</h2>
                <p>Menü fotoğrafından o işletmeye özel demo kurun; satış kapanınca restorana dönüştürün.</p>
              </div>
            </div>
            <div className="adm-form">
              {demoUrl ? (
                <div className="adm-field">
                  <span className="adm-label">
                    Demo menü{demoExpires ? ` · ${formatDay(demoExpires)} tarihine kadar` : ""}
                  </span>
                  <a className="sys-link" href={demoUrl} target="_blank" rel="noreferrer">
                    {demoUrl}
                  </a>
                </div>
              ) : (
                <Link href={`/sistem/demolar?aday=${lead.id}`} className="adm-btn">
                  <AdminIcon name="sparkle" size={16} />
                  Bu işletmeye demo kur
                </Link>
              )}

              {restaurant ? (
                <Link href={`/sistem/restoran/${restaurant.id}`} className="adm-btn adm-btn-ok">
                  <AdminIcon name="store" size={16} />
                  Restoran hesabı: {restaurant.name}
                </Link>
              ) : (
                <Link href={`/sistem/yeni-restoran?${convertParams.toString()}`} className="adm-btn adm-btn-primary">
                  <AdminIcon name="check" size={16} />
                  Kazanıldı · restorana dönüştür
                </Link>
              )}
            </div>
          </section>

          <section className="adm-card" aria-labelledby="foto-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="foto-baslik">Fotoğraflar</h2>
                <p>Vitrin, mevcut menü ya da masa düzeni.</p>
              </div>
            </div>
            {photos.length > 0 && (
              <div className="saha-photos">
                {photos.map((photo) => (
                  <div key={photo.path} className="saha-photo">
                    <a href={photo.url!} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- süreli bağlantılı özel fotoğraf */}
                      <img src={photo.url!} alt={`${lead.name} fotoğrafı`} loading="lazy" />
                    </a>
                    <form action={deletePhoto}>
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="path" value={photo.path} />
                      <ConfirmButton message="Fotoğraf silinsin mi?" className="" label="Fotoğrafı sil">
                        <AdminIcon name="trash" size={14} />
                      </ConfirmButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <PhotoUploader leadId={lead.id} />
          </section>

          <section className="adm-card" aria-labelledby="bilgi-baslik">
            <div className="adm-card-head">
              <div>
                <h2 id="bilgi-baslik">İşletme bilgileri</h2>
              </div>
            </div>
            <dl className="saha-kv">
              {lead.contact_name && (
                <>
                  <dt>Görüşülen</dt>
                  <dd>
                    {lead.contact_name}
                    {lead.contact_role ? ` · ${lead.contact_role}` : ""}
                  </dd>
                </>
              )}
              {lead.phone && (
                <>
                  <dt>Telefon</dt>
                  <dd>{lead.phone}</dd>
                </>
              )}
              {lead.address && (
                <>
                  <dt>Adres</dt>
                  <dd>{lead.address}</dd>
                </>
              )}
              {lead.table_count != null && (
                <>
                  <dt>Masa</dt>
                  <dd>{lead.table_count}</dd>
                </>
              )}
              <dt>Şu an menü</dt>
              <dd>
                {labelOf(CURRENT_MENUS, lead.current_menu)}
                {lead.competitor ? ` · ${lead.competitor}` : ""}
              </dd>
              {lead.note && (
                <>
                  <dt>Not</dt>
                  <dd style={{ whiteSpace: "pre-wrap" }}>{lead.note}</dd>
                </>
              )}
              <dt>Kayıt</dt>
              <dd>{formatDay(lead.created_at)}</dd>
            </dl>

            <LocationButton leadId={lead.id} hasLocation={lead.latitude != null} />

            <details className="adm-details">
              <summary>Bilgileri düzenle</summary>
              <div style={{ marginTop: 14 }}>
                <LeadForm lead={lead} />
              </div>
            </details>

            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmButton message={`"${lead.name}" ve tüm görüşme notları silinsin mi?`}>
                <AdminIcon name="trash" size={15} />
                İşletmeyi sil
              </ConfirmButton>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
