"use client";

import { useState } from "react";

type Props = {
  restaurantId: number;
  restaurantName: string;
};

export default function DeleteRestaurantButton({
  restaurantId,
  restaurantName,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `"${restaurantName}" restoranını tamamen silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz. Devam etmek için Tamam'a basın.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/sistem/restoran-sil",
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
            "Restoran silinemedi."
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "RESTORAN SİLME HATASI:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Restoran silinemedi."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="restaurant-delete-button"
      onClick={handleDelete}
      disabled={loading}
      title="Restoranı tamamen sil"
    >
      {loading
        ? "Siliniyor..."
        : "🗑️ Restoranı Sil"}
    </button>
  );
}
