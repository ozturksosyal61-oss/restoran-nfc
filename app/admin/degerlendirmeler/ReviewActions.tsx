"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import AdminIcon from "../AdminIcon";

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
    <div className="adm-review-actions">
      <button
        type="button"
        className={`adm-btn adm-btn-sm ${visible ? "" : "adm-btn-ok"}`}
        onClick={toggleVisibility}
        disabled={loading}
      >
        <AdminIcon name={visible ? "eyeOff" : "check"} size={15} />
        {loading ? "İşleniyor…" : visible ? "Gizle" : "Onayla ve yayınla"}
      </button>
      <button
        type="button"
        className="adm-btn adm-btn-sm adm-btn-icon adm-btn-ghost adm-text-danger"
        onClick={deleteReview}
        disabled={loading}
        aria-label="Değerlendirmeyi sil"
        title="Sil"
      >
        <AdminIcon name="trash" size={15} />
      </button>
    </div>
  );
}
