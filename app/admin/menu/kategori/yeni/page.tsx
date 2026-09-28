"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import AdminIcon from "../../../AdminIcon";

export default function NewCategoryPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const categoryName = name.trim();

    if (!categoryName) {
      setError("Kategori adı zorunludur.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // =====================================================
      // GİRİŞ YAPAN KULLANICI
      // =====================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      // =====================================================
      // KULLANICININ RESTORANI
      // =====================================================

      const { data: membership, error: membershipError } =
        await supabase
          .from("restaurant_users")
          .select("restaurant_id")
          .eq("user_id", user.id)
          .single();

      if (membershipError || !membership) {
        console.error(
          "Restoran bağlantısı bulunamadı:",
          membershipError
        );

        setError(
          "Hesabınıza bağlı restoran bulunamadı."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // MEVCUT KATEGORİ SAYISI
      // =====================================================

      const {
        count,
        error: countError,
      } = await supabase
        .from("categories")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "restaurant_id",
          membership.restaurant_id
        );

      if (countError) {
        console.error(
          "Kategori sayısı alınamadı:",
          countError
        );

        setError(
          "Kategori sırası belirlenemedi."
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // YENİ KATEGORİ
      // =====================================================

      const sortOrder = (count ?? 0) + 1;

      const {
        error: insertError,
      } = await supabase
        .from("categories")
        .insert({
          restaurant_id:
            membership.restaurant_id,

          name: categoryName,

          sort_order: sortOrder,
        });

      if (insertError) {
        console.error(
          "Kategori oluşturma hatası:",
          insertError
        );

        setError(
          "Kategori oluşturulamadı: " +
            insertError.message
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // BAŞARILI
      // =====================================================

      router.push("/admin/menu/kategori");
      router.refresh();

    } catch (error) {
      console.error(
        "Beklenmeyen kategori hatası:",
        error
      );

      setError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );

      setLoading(false);
    }
  }

  return (
    <main className="adm-page" style={{ maxWidth: 640 }}>
      <a className="adm-back" href="/admin/menu/kategori">
        <AdminIcon name="arrowLeft" size={15} />
        Kategoriler
      </a>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Yeni kategori</h1>
          <p>Kategori, müşteri menüsünde listenin sonuna eklenir.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="adm-card adm-form">
        <div className="adm-field">
          <label className="adm-label" htmlFor="category-name">Kategori adı</label>
          <input
            id="category-name"
            className="adm-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Örn. Ana yemekler"
            maxLength={60}
            disabled={loading}
            autoFocus
          />
        </div>

        {error && (
          <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
            <AdminIcon name="alert" size={16} />
            {error}
          </p>
        )}

        <div className="adm-form-actions">
          <a className="adm-btn" href="/admin/menu/kategori">Vazgeç</a>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
            <AdminIcon name="plus" size={16} />
            {loading ? "Ekleniyor…" : "Kategori ekle"}
          </button>
        </div>
      </form>
    </main>
  );
}
