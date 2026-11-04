import Link from "next/link";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { APP_COLUMNS, APP_STATUSES, appImageUrl, type AppEntry } from "../../../lib/apps";
import AdminIcon from "../../admin/AdminIcon";
import { ConfirmButton } from "../saha/SalesForms";
import AppForm from "./AppForm";
import { deleteApp, moveApp } from "./actions";

export const dynamic = "force-dynamic";

type Search = { duzenle?: string; yeni?: string };

const BADGE: Record<string, string> = { yayinda: "s-ok", beta: "s-pending", yakinda: "s-accent", gizli: "" };

export default async function AppsAdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSystemAdmin();
  const { duzenle, yeni } = await searchParams;

  const { data, error } = await createSupabaseAdminClient()
    .from("apps")
    .select(APP_COLUMNS)
    .order("sort_order")
    .order("created_at");
  const apps = (data ?? []) as AppEntry[];
  const editing = duzenle ? apps.find((app) => app.id === duzenle) : undefined;
  const showForm = !!editing || yeni === "1";

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Web sitesi</span>
          <h1>Uygulamalar</h1>
          <p>oztdigital.com.tr/uygulamalar sayfasında görünen mobil uygulamalar.</p>
        </div>
        {!showForm && (
          <Link href="/sistem/uygulamalar?yeni=1" className="adm-btn adm-btn-primary">
            <AdminIcon name="plus" size={16} />
            Yeni uygulama
          </Link>
        )}
      </header>

      {error ? (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Uygulamalar tablosu bulunamadı. 20261106_apps.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.
        </p>
      ) : showForm ? (
        <AppForm key={editing?.id ?? "yeni"} app={editing ?? null} />
      ) : apps.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name="sparkle" />
          </span>
          <p>Henüz uygulama yok.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {apps.map((app, index) => (
            <li key={app.id} className="adm-card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  flex: "none",
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  background: app.accent_color,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {app.icon_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appImageUrl(app.icon_path)} alt="" width={48} height={48} style={{ objectFit: "cover" }} />
                ) : (
                  app.name[0]
                )}
              </span>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <strong>{app.name}</strong>{" "}
                <span className={`adm-badge is-dot ${BADGE[app.status]}`}>
                  {APP_STATUSES.find((item) => item.value === app.status)?.label}
                </span>
                <div className="adm-hint">/{app.slug} · {app.screenshots.length} ekran görüntüsü</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(["up", "down"] as const).map((direction) => (
                  <form key={direction} action={moveApp}>
                    <input type="hidden" name="id" value={app.id} />
                    <input type="hidden" name="direction" value={direction} />
                    <button
                      type="submit"
                      className="adm-btn adm-btn-sm adm-btn-ghost"
                      disabled={direction === "up" ? index === 0 : index === apps.length - 1}
                      aria-label={direction === "up" ? "Yukarı taşı" : "Aşağı taşı"}
                    >
                      <AdminIcon name={direction} size={14} />
                    </button>
                  </form>
                ))}
                <Link href={`/sistem/uygulamalar?duzenle=${app.id}`} className="adm-btn adm-btn-sm">
                  <AdminIcon name="edit" size={14} />
                  Düzenle
                </Link>
                <form action={deleteApp}>
                  <input type="hidden" name="id" value={app.id} />
                  <ConfirmButton message={`${app.name} silinsin mi? Görselleri de silinir.`} label="Sil">
                    <AdminIcon name="trash" size={14} />
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
