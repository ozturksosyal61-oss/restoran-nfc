"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type Props = {
  reviewId: number;
  isVisible: boolean;
};

export default function ReviewActions({
  reviewId,
  isVisible,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(isVisible);

  async function toggleVisibility() {
    if (loading) return;

    setLoading(true);

    try {
      const supabase = createClient();

      const newVisibility = !visible;

      console.log("Görünürlük değiştiriliyor:", {
        reviewId,
        oldValue: visible,
        newValue: newVisibility,
      });

      const { error } = await supabase
        .from("reviews")
        .update({
          is_visible: newVisibility,
        })
        .eq("id", reviewId);

      if (error) {
        console.error(
          "Görünürlük güncelleme hatası:",
          error
        );

        alert(
          "Değerlendirme güncellenemedi.\n\n" +
            error.message
        );

        return;
      }

      console.log(
        "Görünürlük başarıyla güncellendi."
      );

      setVisible(newVisibility);

      router.refresh();
    } catch (error) {
      console.error(
        "Beklenmeyen hata:",
        error
      );

      alert(
        "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteReview() {
    if (loading) return;

    const confirmed = window.confirm(
      "Bu değerlendirmeyi silmek istediğinize emin misiniz?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const supabase = createClient();

      console.log(
        "Değerlendirme siliniyor:",
        reviewId
      );

      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) {
        console.error(
          "Silme hatası:",
          error
        );

        alert(
          "Değerlendirme silinemedi.\n\n" +
            error.message
        );

        return;
      }

      console.log(
        "Değerlendirme başarıyla silindi."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Beklenmeyen hata:",
        error
      );

      alert(
        "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        marginTop: "15px",
      }}
    >
      <button
        type="button"
        onClick={toggleVisibility}
        disabled={loading}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          background: "#fff",
          color: "#333",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          fontWeight: 700,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading
          ? "İşleniyor..."
          : visible
          ? "🙈 Gizle"
          : "👁️ Yayına Al"}
      </button>

      <button
        type="button"
        onClick={deleteReview}
        disabled={loading}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "none",
          background: "#c62828",
          color: "#fff",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          fontWeight: 700,
          opacity: loading ? 0.6 : 1,
        }}
      >
        🗑️ Sil
      </button>
    </div>
  );
}