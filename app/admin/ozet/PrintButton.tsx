"use client";

import AdminIcon from "../AdminIcon";

// Özeti yazdırır; tarayıcının yazdır penceresinden PDF olarak da kaydedilir.
export default function PrintButton() {
  return (
    <button type="button" className="adm-btn" onClick={() => window.print()}>
      <AdminIcon name="download" size={16} />
      Yazdır / PDF
    </button>
  );
}
