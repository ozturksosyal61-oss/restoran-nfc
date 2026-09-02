"use client";

import { useState } from "react";

type Props = {
  restaurantId: number;
  restaurantName: string;
};

export default function ArchiveRestaurantButton({
  restaurantId,
  restaurantName,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(
      `"${restaurantName}" restoranını devre dışı bırakmak istediğinizden emin misiniz?\n\nRestoran müşterilere kapatılacak ve sistem panelindeki aktif listeden çıkarılacak. Sipariş, ürün, masa, abonelik ve diğer geçmiş kayıtlar korunacaktır.\n\nDevam etmek için Tamam'a basın.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/sistem/restoran-devre-disi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Restoran devre dışı bırakılamadı."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "RESTORAN DEVRE DIŞI BIRAKMA HATASI:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Restoran devre dışı bırakılamadı."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="restaurant-archive-button"
      onClick={handleArchive}
      disabled={loading}
      title="Restoranı güvenli şekilde devre dışı bırak"
    >
      {loading
        ? "Kapatılıyor..."
        : "🗄️ Devre Dışı Bırak"}
    </button>
  );
}
