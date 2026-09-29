"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminIcon from "../admin/AdminIcon";

export type DirectoryRow = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  menuOnly: boolean;
  themeLabel: string;
  themeSurface: string;
  themeAccent: string;
  planName: string | null;
  statusLabel: string | null;
  statusTone: string | null;
  endDate: string | null;
  daysLeft: number | null;
  managerEmails: string[];
};

type Filter = "all" | "live" | "off" | "premium" | "menu" | "soon";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "live", label: "Yayında" },
  { value: "off", label: "Devre dışı" },
  { value: "premium", label: "Premium" },
  { value: "menu", label: "Sadece menü" },
  { value: "soon", label: "Süresi yaklaşan" },
];

function matches(row: DirectoryRow, filter: Filter) {
  switch (filter) {
    case "live":
      return row.isActive;
    case "off":
      return !row.isActive;
    case "premium":
      return !row.menuOnly;
    case "menu":
      return row.menuOnly;
    case "soon":
      return row.daysLeft !== null && row.daysLeft <= 7;
    default:
      return true;
  }
}

export default function RestaurantDirectory({ rows }: { rows: DirectoryRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const query = search.trim().toLocaleLowerCase("tr-TR");

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          matches(row, filter) &&
          (!query ||
            [row.name, row.slug, ...row.managerEmails]
              .join(" ")
              .toLocaleLowerCase("tr-TR")
              .includes(query))
      ),
    [rows, filter, query]
  );

  return (
    <section className="adm-section" aria-labelledby="restoran-listesi">
      <div className="adm-section-head">
        <div>
          <h2 id="restoran-listesi">Restoranlar</h2>
          <p>Bir restorana tıklayın: yönetici giriş bilgileri, paket, tema ve yayın durumu.</p>
        </div>
      </div>

      <div className="adm-toolbar-row">
        <nav className="adm-chips" aria-label="Restoranları filtrele">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`adm-chip ${filter === item.value ? "is-active" : ""}`}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <b>{rows.filter((row) => matches(row, item.value)).length}</b>
            </button>
          ))}
        </nav>
        <label className="adm-input-group sys-search">
          <AdminIcon name="search" size={16} />
          <input
            id="restoran-ara"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Restoran, adres ya da yönetici e-postası"
            aria-label="Restoranlarda ara"
            autoComplete="off"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name="store" />
          </span>
          <strong>{rows.length === 0 ? "Henüz restoran yok" : "Eşleşen restoran yok"}</strong>
          <p>
            {rows.length === 0
              ? "İlk restoranı oluşturduğunuzda burada listelenir."
              : "Aramayı ya da filtreyi değiştirin."}
          </p>
          {rows.length === 0 && (
            <Link className="adm-btn adm-btn-primary" href="/sistem/yeni-restoran">
              <AdminIcon name="plus" size={16} />
              Yeni restoran
            </Link>
          )}
        </div>
      ) : (
        <ul className="sys-list">
          {visible.map((row) => (
            <li key={row.id}>
              <Link href={`/sistem/restoran/${row.id}`} className={`sys-row ${row.isActive ? "" : "is-off"}`}>
                <span className="sys-logo" aria-hidden="true">
                  {row.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.logoUrl} alt="" />
                  ) : (
                    row.name.trim().charAt(0).toLocaleUpperCase("tr-TR")
                  )}
                </span>

                <span className="sys-row-name">
                  <strong>{row.name}</strong>
                  <small>/restoran/{row.slug}</small>
                </span>

                <span className="sys-row-type">
                  <span className={`adm-badge ${row.menuOnly ? "s-accent" : ""}`}>
                    {row.menuOnly ? "Sadece menü" : "Premium"}
                  </span>
                  <span className="sys-row-theme" title={row.themeLabel}>
                    <span
                      className="sys-dot"
                      style={{ background: row.themeSurface, borderColor: row.themeAccent }}
                      aria-hidden="true"
                    />
                    {row.themeLabel.replace(/^AURORA - /, "Aurora · ")}
                  </span>
                </span>

                <span className="sys-row-plan">
                  {row.statusLabel ? (
                    <>
                      <span className={`adm-badge is-dot ${row.statusTone ?? ""}`}>
                        {row.planName ?? "Paket"} · {row.statusLabel}
                      </span>
                      {row.daysLeft !== null && (
                        <small className={row.daysLeft <= 7 ? "is-soon" : ""}>
                          {row.daysLeft === 0 ? "Bugün bitiyor" : `${row.daysLeft} gün kaldı`}
                        </small>
                      )}
                    </>
                  ) : (
                    <span className="adm-badge">Abonelik yok</span>
                  )}
                </span>

                <span className="sys-row-manager">
                  <AdminIcon name="user" size={14} />
                  <span>
                    {row.managerEmails[0] ?? "Yönetici yok"}
                    {row.managerEmails.length > 1 && (
                      <em> +{row.managerEmails.length - 1}</em>
                    )}
                  </span>
                </span>

                <span className="sys-row-status">
                  <span className={`adm-badge is-dot ${row.isActive ? "s-ok" : "s-danger"}`}>
                    {row.isActive ? "Yayında" : "Kapalı"}
                  </span>
                  <AdminIcon name="arrowRight" size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
