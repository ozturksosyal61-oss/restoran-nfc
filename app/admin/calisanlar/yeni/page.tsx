"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

export default function YeniCalisanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("garson");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError("Çalışan adı zorunludur.");
      return;
    }

    if (cleanName.length < 2) {
      setError("Çalışan adı en az 2 karakter olmalıdır.");
      return;
    }

    if (cleanName.length > 100) {
      setError("Çalışan adı en fazla 100 karakter olabilir.");
      return;
    }

    setLoading(true);

    try {
      // =====================================================
      // GİRİŞ YAPAN KULLANICI
      // =====================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      // =====================================================
      // KULLANICININ RESTORANI
      // =====================================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .single();

      if (membershipError || !membership?.restaurant_id) {
        console.error(
          "Restoran üyeliği bulunamadı:",
          membershipError
        );

        setError(
          "Kullanıcının bağlı olduğu işletme bulunamadı."
        );
        return;
      }

      // =====================================================
      // ÇALIŞANI OLUŞTUR
      // =====================================================

      const { error: insertError } = await supabase
        .from("employees")
        .insert({
          restaurant_id: membership.restaurant_id,
          name: cleanName,
          phone: cleanPhone || null,
          role,
          is_active: isActive,
        });

      if (insertError) {
        console.error(
          "Çalışan ekleme hatası:",
          insertError
        );

        setError(
          "Çalışan eklenemedi: " +
            insertError.message
        );

        return;
      }

      router.push("/admin/calisanlar");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="admin-page"
      style={{
        minHeight: "100vh",
        background: "#f5f3ef",
        paddingBottom: "60px",
      }}
    >
      <section
        className="admin-header"
        style={{
          marginBottom: "18px",
        }}
      >
        <a
          href="/admin/calisanlar"
          style={{
            display: "inline-block",
            marginBottom: "16px",
            color: "#777",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          ← Çalışanlara Dön
        </a>

        <div
          style={{
            color: "#c58d08",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "1.7px",
            marginBottom: "7px",
          }}
        >
          EKİP YÖNETİMİ
        </div>

        <h1
          style={{
            margin: 0,
          }}
        >
          Yeni Çalışan
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            color: "#777",
          }}
        >
          İşletmenize yeni bir çalışan ekleyin.
        </p>
      </section>

      <section
        className="admin-form"
        style={{
          maxWidth: "720px",
          background: "#fff",
          border: "1px solid #e5e0d8",
          borderRadius: "19px",
          padding: "24px",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* =================================================
              AD SOYAD
          ================================================= */}

          <label
            style={{
              display: "block",
              marginBottom: "17px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "12px",
                fontWeight: 800,
                color: "#292929",
              }}
            >
              Ad Soyad
            </span>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Örn. Ahmet Yılmaz"
              autoComplete="name"
              maxLength={100}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border: "1px solid #d9d4cc",
                borderRadius: "10px",
                background: "#fff",
                color: "#171717",
                fontSize: "14px",
              }}
            />
          </label>

          {/* =================================================
              TELEFON
          ================================================= */}

          <label
            style={{
              display: "block",
              marginBottom: "17px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "12px",
                fontWeight: 800,
                color: "#292929",
              }}
            >
              Telefon
            </span>

            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="05XX XXX XX XX"
              autoComplete="tel"
              maxLength={30}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border: "1px solid #d9d4cc",
                borderRadius: "10px",
                background: "#fff",
                color: "#171717",
                fontSize: "14px",
              }}
            />
          </label>

          {/* =================================================
              GÖREV
          ================================================= */}

          <label
            style={{
              display: "block",
              marginBottom: "17px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "12px",
                fontWeight: 800,
                color: "#292929",
              }}
            >
              Görev
            </span>

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border: "1px solid #d9d4cc",
                borderRadius: "10px",
                background: "#fff",
                color: "#171717",
                fontSize: "14px",
              }}
            >
              <option value="garson">
                🧑‍🍽️ Garson
              </option>

              <option value="mutfak">
                👨‍🍳 Mutfak
              </option>

              <option value="yonetici">
                👔 Yönetici
              </option>
            </select>

            <small
              style={{
                display: "block",
                marginTop: "6px",
                color: "#888",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              Görev bilgisi çalışan listesindeki rol
              olarak gösterilir.
            </small>
          </label>

          {/* =================================================
              AKTİF
          ================================================= */}

          <div
            style={{
              padding: "16px",
              marginBottom: "18px",
              border: "1px solid #e5e0d8",
              borderRadius: "14px",
              background: "#faf9f7",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) =>
                  setIsActive(event.target.checked)
                }
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "#d49a16",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />

              <span>
                <strong
                  style={{
                    display: "block",
                    fontSize: "13px",
                  }}
                >
                  Çalışan aktif
                </strong>

                <small
                  style={{
                    display: "block",
                    marginTop: "3px",
                    color: "#777",
                    fontSize: "11px",
                  }}
                >
                  Aktif çalışan olarak işaretle.
                </small>
              </span>
            </label>
          </div>

          {/* =================================================
              HATA
          ================================================= */}

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: "17px",
                padding: "13px 15px",
                borderRadius: "11px",
                background: "#fff0f0",
                border: "1px solid #efb1b1",
                color: "#b42318",
                fontSize: "12px",
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* =================================================
              BUTONLAR
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "9px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/admin/calisanlar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                boxSizing: "border-box",
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1px solid #d9d4cc",
                background: "#fff",
                color: "#333",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              Vazgeç
            </a>

            <button
              type="submit"
              disabled={loading}
              style={{
                minHeight: "44px",
                padding: "11px 20px",
                border: "none",
                borderRadius: "10px",
                background: loading
                  ? "#999"
                  : "#d49a16",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 900,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                boxShadow:
                  "0 8px 18px rgba(0,0,0,.10)",
              }}
            >
              {loading
                ? "Çalışan Ekleniyor..."
                : "✓ Çalışanı Kaydet"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
