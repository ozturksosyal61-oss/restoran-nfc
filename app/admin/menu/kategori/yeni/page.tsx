"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";

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

      router.push("/admin/menu");
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
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f3ef",
        padding: "40px 18px",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >

        {/* =================================================
            BAŞLIK
        ================================================= */}

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              color: "#c8941d",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "2px",
              marginBottom: "7px",
            }}
          >
            MENÜ YÖNETİMİ
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: 900,
              color: "#171717",
            }}
          >
            Yeni Kategori
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#777",
              fontSize: "14px",
            }}
          >
            Menünüze yeni bir kategori ekleyin.
          </p>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            border: "1px solid #e5e0d8",
            borderRadius: "18px",
            padding: "24px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >

          <label
            htmlFor="category-name"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 800,
              color: "#222",
              marginBottom: "8px",
            }}
          >
            Kategori Adı
          </label>

          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Örn. Ana Yemekler"
            disabled={loading}
            autoFocus
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: "50px",
              border: "1px solid #ddd7ce",
              borderRadius: "10px",
              padding: "0 14px",
              fontSize: "15px",
              outline: "none",
              background: "#fff",
              color: "#171717",
            }}
          />

          {/* =================================================
              HATA
          ================================================= */}

          {error && (
            <div
              style={{
                marginTop: "14px",
                padding: "11px 13px",
                borderRadius: "10px",
                background: "#fff0f0",
                border: "1px solid #ffd0d0",
                color: "#b42318",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* =================================================
              BUTONLAR
          ================================================= */}

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
            }}
          >

            <button
              type="button"
              onClick={() =>
                router.push("/admin/menu")
              }
              disabled={loading}
              style={{
                flex: 1,
                height: "48px",
                border: "1px solid #ddd7ce",
                borderRadius: "10px",
                background: "#fff",
                color: "#333",
                fontWeight: 800,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                height: "48px",
                border: "none",
                borderRadius: "10px",
                background: "#c8941d",
                color: "#fff",
                fontWeight: 800,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Oluşturuluyor..."
                : "＋ Kategori Oluştur"}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}