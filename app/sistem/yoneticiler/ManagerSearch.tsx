"use client";

import { useState } from "react";
import Link from "next/link";
import AdminIcon from "../../admin/AdminIcon";

type Row = {
  key: string;
  email: string;
  restaurantId: number;
  restaurantName: string;
  restaurantActive: boolean;
  lastLogin: string | null;
  linkedAt: string | null;
};

export default function ManagerSearch({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("tr-TR");
  const visible = rows.filter(
    (row) =>
      !query ||
      `${row.email} ${row.restaurantName}`.toLocaleLowerCase("tr-TR").includes(query)
  );

  return (
    <section className="adm-section" aria-labelledby="yonetici-listesi">
      <div className="adm-section-head">
        <div>
          <h2 id="yonetici-listesi">Hesaplar</h2>
          <p>{rows.length} yönetici</p>
        </div>
        <label className="adm-input-group sys-search">
          <AdminIcon name="search" size={16} />
          <input
            id="yonetici-ara"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="E-posta ya da restoran"
            aria-label="Yöneticilerde ara"
            autoComplete="off"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="user" /></span>
          <strong>{rows.length === 0 ? "Henüz yönetici yok" : "Eşleşen yönetici yok"}</strong>
          <p>
            {rows.length === 0
              ? "Yeni restoran oluştururken yönetici hesabı da açılır."
              : "Farklı bir e-posta ya da restoran adı deneyin."}
          </p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Giriş e-postası</th>
                <th>Restoran</th>
                <th>Son giriş</th>
                <th>Hesap bağlandı</th>
                <th aria-label="İşlem" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.key}>
                  <td>
                    <span className="sys-cell-email">
                      <AdminIcon name="mail" size={15} />
                      <strong>{row.email}</strong>
                    </span>
                  </td>
                  <td>
                    <Link href={`/sistem/restoran/${row.restaurantId}`} className="sys-link">
                      {row.restaurantName}
                    </Link>
                    {!row.restaurantActive && (
                      <span className="adm-badge s-danger" style={{ marginLeft: 8 }}>Kapalı</span>
                    )}
                  </td>
                  <td className={row.lastLogin ? "" : "adm-muted"}>
                    {row.lastLogin ?? "Hiç giriş yapmadı"}
                  </td>
                  <td className="adm-muted">{row.linkedAt ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/sistem/restoran/${row.restaurantId}`}
                      className="adm-btn adm-btn-sm"
                    >
                      <AdminIcon name="lock" size={14} />
                      Giriş bilgileri
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
