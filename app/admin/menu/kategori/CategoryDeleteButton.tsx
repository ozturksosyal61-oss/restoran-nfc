"use client";

import { useState } from "react";
import { deleteCategory } from "./actions";

export default function CategoryDeleteButton({
  categoryId,
}: {
  categoryId: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Bu kategoriyi silmek istediğinize emin misiniz?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await deleteCategory(categoryId);

      if (result?.error) {
        alert(result.error);
      }
    } catch (error) {
      alert("Kategori silinirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="delete-button"
    >
      {loading ? "Siliniyor..." : "🗑️ Sil"}
    </button>
  );
}