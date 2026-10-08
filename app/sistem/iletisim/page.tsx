import Link from "next/link";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { CONTACT_STATUSES, CONTACT_TOPICS, type ContactRequest } from "../../../lib/contact";
import { formatDay, telLink, whatsappLink } from "../../../lib/sales";
import AdminIcon from "../../admin/AdminIcon";
import { ConfirmButton } from "../saha/SalesForms";
import { convertToLead, deleteContactRequest, saveContactNote, setContactStatus } from "./actions";
import "../saha/saha.css";

export const dynamic = "force-dynamic";

type Search = { durum?: string };

function replyMessage(request: ContactRequest) {
  return (
    `Merhaba ${request.name}, OZT Digital'den yazıyorum. İletişim formunuz için teşekkür ederiz. ` +
    "Size uygun bir zamanda kısaca görüşebilir miyiz?"
  );
}

export default async function ContactRequestsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSystemAdmin();
  const { durum } = await searchParams;
  const filter = CONTACT_STATUSES.some((item) => item.value === durum) ? durum : durum === "tumu" ? "tumu" : "yeni";

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contact_requests")
    .select("id, name, business_name, phone, email, city, topic, message, status, admin_note, lead_id, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const all = (data ?? []) as ContactRequest[];
  const counts = new Map<string, number>();
  for (const request of all) counts.set(request.status, (counts.get(request.status) ?? 0) + 1);
  const rows = filter === "tumu" ? all : all.filter((request) => request.status === filter);

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Satış</span>
          <h1>İletişim talepleri</h1>
          <p>oztdigital.com.tr ana sayfasındaki “Bizimle iletişime geçin” formunu dolduranlar.</p>
        </div>
        {!error && (
          <span className={`adm-badge is-dot ${(counts.get("yeni") ?? 0) > 0 ? "s-pending" : "s-ok"}`}>
            {counts.get("yeni") ?? 0} yeni talep
          </span>
        )}
      </header>

      {error ? (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          İletişim tablosu bulunamadı. 20261021_contact_requests.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.
        </p>
      ) : (
        <>
          <nav className="adm-chips" aria-label="Durum">
            {CONTACT_STATUSES.map((status) => (
              <Link
                key={status.value}
                href={`/sistem/iletisim?durum=${status.value}`}
                className={`adm-chip ${filter === status.value ? "is-active" : ""}`}
              >
                {status.label} <b>{counts.get(status.value) ?? 0}</b>
              </Link>
            ))}
            <Link href="/sistem/iletisim?durum=tumu" className={`adm-chip ${filter === "tumu" ? "is-active" : ""}`}>
              Tümü <b>{all.length}</b>
            </Link>
          </nav>

          {rows.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon">
                <AdminIcon name="mail" />
              </span>
              <strong>{filter === "yeni" ? "Yeni talep yok" : "Bu durumda talep yok"}</strong>
              <p>Ana sayfadaki iletişim formundan gelen mesajlar burada görünür.</p>
            </div>
          ) : (
            <div className="saha-list">
              {rows.map((request) => {
                const status = CONTACT_STATUSES.find((item) => item.value === request.status) ?? CONTACT_STATUSES[0];
                const topic = CONTACT_TOPICS.find((item) => item.value === request.topic)?.label ?? "Diğer";
                const tel = telLink(request.phone);
                const whatsapp = whatsappLink(request.phone, replyMessage(request));
                return (
                  <article key={request.id} className="adm-card" style={{ gap: 12, padding: 16 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "6px 12px" }}>
                      <div style={{ display: "grid", gap: 2, flex: "1 1 220px", minWidth: 0 }}>
                        <strong style={{ fontSize: 16 }}>
                          {request.name}
                          {request.business_name ? ` · ${request.business_name}` : ""}
                        </strong>
                        <span className="adm-muted" style={{ fontSize: 13 }}>
                          {formatDay(request.created_at)}
                          {request.city ? ` · ${request.city}` : ""}
                        </span>
                      </div>
                      <span className="adm-badge s-accent">{topic}</span>
                      <span className={`adm-badge is-dot ${status.tone}`}>{status.label}</span>
                    </div>

                    <dl className="saha-kv">
                      {request.phone && (
                        <>
                          <dt>Telefon</dt>
                          <dd>{request.phone}</dd>
                        </>
                      )}
                      {request.email && (
                        <>
                          <dt>E-posta</dt>
                          <dd>{request.email}</dd>
                        </>
                      )}
                    </dl>

                    {request.message && (
                      <p className="saha-visit-note" style={{ margin: 0 }}>
                        {request.message}
                      </p>
                    )}

                    <div className="saha-actions">
                      {tel && (
                        <a href={tel} className="adm-btn adm-btn-sm adm-btn-primary">
                          <AdminIcon name="phone" size={15} />
                          Ara
                        </a>
                      )}
                      {whatsapp && (
                        <a href={whatsapp} target="_blank" rel="noreferrer" className="adm-btn adm-btn-sm">
                          <AdminIcon name="chat" size={15} />
                          WhatsApp
                        </a>
                      )}
                      {request.email && (
                        <a
                          href={`mailto:${request.email}?subject=${encodeURIComponent("OZT Digital – iletişim talebiniz")}`}
                          className="adm-btn adm-btn-sm"
                        >
                          <AdminIcon name="mail" size={15} />
                          E-posta
                        </a>
                      )}
                      {request.lead_id ? (
                        <Link href={`/sistem/saha/${request.lead_id}`} className="adm-btn adm-btn-sm">
                          <AdminIcon name="pin" size={15} />
                          Saha kaydını aç
                        </Link>
                      ) : (
                        <form action={convertToLead}>
                          <input type="hidden" name="id" value={request.id} />
                          <button type="submit" className="adm-btn adm-btn-sm">
                            <AdminIcon name="plus" size={15} />
                            Saha satışa ekle
                          </button>
                        </form>
                      )}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <span className="adm-muted" style={{ fontSize: 13 }}>
                        Durum:
                      </span>
                      {CONTACT_STATUSES.filter((item) => item.value !== request.status).map((item) => (
                        <form key={item.value} action={setContactStatus}>
                          <input type="hidden" name="id" value={request.id} />
                          <input type="hidden" name="status" value={item.value} />
                          <button type="submit" className="adm-chip">
                            {item.label} yap
                          </button>
                        </form>
                      ))}
                      <form action={deleteContactRequest} style={{ marginInlineStart: "auto" }}>
                        <input type="hidden" name="id" value={request.id} />
                        <ConfirmButton message={`${request.name} adlı kişinin talebi silinsin mi?`} label="Talebi sil">
                          <AdminIcon name="trash" size={15} />
                        </ConfirmButton>
                      </form>
                    </div>

                    <form action={saveContactNote} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <input type="hidden" name="id" value={request.id} />
                      <input
                        name="admin_note"
                        className="adm-input"
                        defaultValue={request.admin_note ?? ""}
                        maxLength={1000}
                        placeholder="Kendi notunuz (ör. salı 14:00'te arandı, demo istedi)"
                        aria-label="Not"
                        style={{ flex: "1 1 240px" }}
                      />
                      <button type="submit" className="adm-btn adm-btn-sm">
                        <AdminIcon name="save" size={15} />
                        Notu kaydet
                      </button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
