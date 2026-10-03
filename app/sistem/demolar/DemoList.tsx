"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import AdminIcon, { type AdminIconName } from "../../admin/AdminIcon";
import { ResultNote } from "../SystemUi";
import { deleteDemo, extendDemo, makeDemoPermanent, type DemoResult } from "./actions";

export type DemoRow = {
  restaurantId: number;
  name: string;
  note: string | null;
  slug: string;
  tableToken: string | null;
  managerEmail: string | null;
  createdAt: string;
  expiresAt: string | null;
  // Sunucuda hesaplanır (bitişe kalan gün; süresizse null).
  daysLeft: number | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" });
}

function SubmitButton({ label, icon, pending, tone = "" }: { label: string; icon: AdminIconName; pending: string; tone?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={`adm-btn adm-btn-sm ${tone}`} disabled={busy}>
      <AdminIcon name={icon} size={14} />
      {busy ? pending : label}
    </button>
  );
}

function DemoActions({ row }: { row: DemoRow }) {
  const [extendResult, extendAction] = useActionState<DemoResult, FormData>(extendDemo, null);
  const [permanentResult, permanentAction] = useActionState<DemoResult, FormData>(makeDemoPermanent, null);
  const [deleteResult, deleteAction] = useActionState<DemoResult, FormData>(deleteDemo, null);
  const result = deleteResult ?? permanentResult ?? extendResult;
  const menuUrl = row.tableToken ? `/restoran/${row.slug}?masa=${encodeURIComponent(row.tableToken)}` : `/restoran/${row.slug}`;

  return (
    <div className="sys-demo-actions">
      <div className="sys-demo-buttons">
        <a className="adm-btn adm-btn-sm" href={menuUrl} target="_blank" rel="noreferrer">
          <AdminIcon name="external" size={14} />
          Menü
        </a>
        <form action={extendAction}>
          <input type="hidden" name="restaurant_id" value={row.restaurantId} />
          <SubmitButton label="7 gün uzat" icon="clock" pending="Uzatılıyor…" />
        </form>
        <form
          action={permanentAction}
          onSubmit={(event) => {
            if (!window.confirm(`${row.name} kalıcı restorana çevrilsin mi? Demo süresi kalkar; ardından gerçek yönetici hesabını ekleyin.`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="restaurant_id" value={row.restaurantId} />
          <SubmitButton label="Müşteri oldu" icon="check" pending="Kaydediliyor…" />
        </form>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm(`${row.name} demosu ve tüm verisi silinsin mi?`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="restaurant_id" value={row.restaurantId} />
          <SubmitButton label="Sil" icon="trash" pending="Siliniyor…" tone="adm-btn-ghost adm-text-danger" />
        </form>
      </div>
      <ResultNote result={result} />
    </div>
  );
}

export default function DemoList({ rows }: { rows: DemoRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="adm-empty">
        <span className="adm-empty-icon">
          <AdminIcon name="sparkle" />
        </span>
        <strong>Henüz demo yok</strong>
        <p>İlk görüşmenizden önce yukarıdan bir demo oluşturun.</p>
      </div>
    );
  }

  return (
    <section className="adm-section" aria-labelledby="demo-liste">
      <div className="adm-section-head">
        <div>
          <h2 id="demo-liste">Demolar</h2>
          <p>{rows.length} demo</p>
        </div>
      </div>
      <ul className="sys-demo-list">
        {rows.map((row) => {
          const daysLeft = row.daysLeft;
          const expired = daysLeft !== null && daysLeft <= 0;
          return (
            <li key={row.restaurantId} className="adm-card">
              <div className="sys-demo-head">
                <div>
                  <strong>{row.name}</strong>
                  <span className="adm-hint">
                    {formatDate(row.createdAt)} oluşturuldu
                    {row.managerEmail ? ` · panel: ${row.managerEmail}` : ""}
                  </span>
                  {row.note && <span className="adm-hint">{row.note}</span>}
                </div>
                <span className={`adm-badge is-dot ${expired ? "s-danger" : daysLeft !== null && daysLeft <= 2 ? "s-pending" : "s-ok"}`}>
                  {expired ? "Süresi doldu" : daysLeft === null ? "Süresiz" : `${daysLeft} gün kaldı`}
                </span>
              </div>
              <DemoActions row={row} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
