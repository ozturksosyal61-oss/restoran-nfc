"use client";

import { useState } from "react";

export default function RemoveManagerButton({
  managerId,
}: {
  managerId: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const confirmed = confirm(
      "Bu yöneticiyi restorandan kaldırmak istediğinize emin misiniz?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/sistem/yonetici/${managerId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Yönetici kaldırılamadı.");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Kaldırılıyor..." : "🗑️ Kaldır"}
    </button>
  );
}