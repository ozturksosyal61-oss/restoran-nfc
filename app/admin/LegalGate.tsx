"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminIcon from "./AdminIcon";
import { ACCEPTANCE_DOCUMENTS, LEGAL_UPDATED } from "../../lib/legal";
import { acceptLegalAction } from "./legal-actions";

// İşletme paneline ilk girişte (ve sözleşmeler güncellenince) gösterilir.
// Onaylanmadan panel açılmaz; müşteri menüsü bundan etkilenmez.
export default function LegalGate({ restaurantName }: { restaurantName: string }) {
  const router = useRouter();
  const [result, action, pending] = useActionState(acceptLegalAction, null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = ACCEPTANCE_DOCUMENTS.every((document) => checked[document.key]);

  useEffect(() => {
    if (result?.ok) router.refresh();
  }, [result, router]);

  return (
    <main className="adm-page" style={{ maxWidth: 720 }}>
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Sözleşmeler</span>
          <h1>Devam etmeden önce</h1>
          <p>
            {restaurantName} için OZT Digital hizmet sözleşmelerini onaylamanız gerekiyor. Belgeleri yeni sekmede
            okuyabilirsiniz. Son güncelleme: {LEGAL_UPDATED}.
          </p>
        </div>
      </header>

      <form action={action} className="adm-card adm-form" style={{ padding: 20 }}>
        {ACCEPTANCE_DOCUMENTS.map((document) => (
          <label key={document.key} className="adm-check">
            <input
              type="checkbox"
              name={document.key}
              checked={Boolean(checked[document.key])}
              onChange={(event) => setChecked((current) => ({ ...current, [document.key]: event.target.checked }))}
            />
            <span>
              <strong>
                <a href={document.href} target="_blank" rel="noreferrer">
                  {document.label}
                </a>
                {document.after}
              </strong>
            </span>
          </label>
        ))}

        <p className="adm-hint" style={{ margin: 0 }}>
          Onay tarihi, saati ve bağlantı (IP) bilginiz sözleşme kaydı olarak saklanır.
        </p>

        {result && (
          <p className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`} role="status" style={{ margin: 0 }}>
            <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
            {result.message}
          </p>
        )}

        <button
          type="submit"
          className="adm-btn adm-btn-primary adm-btn-lg adm-btn-block"
          disabled={!allChecked || pending}
        >
          <AdminIcon name="check" size={17} />
          {pending ? "Kaydediliyor…" : "Onaylıyorum ve devam et"}
        </button>
      </form>
    </main>
  );
}
