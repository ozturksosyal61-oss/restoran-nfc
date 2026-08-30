"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Employee = {
  id: number;
  restaurant_id: number;
  name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
};

export default function EditEmployeeForm({
  employee,
}: {
  employee: Employee;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(
    employee.phone || ""
  );
  const [role, setRole] = useState(employee.role);
  const [isActive, setIsActive] = useState(
    employee.is_active
  );

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

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

      if (
        membershipError ||
        !membership?.restaurant_id
      ) {
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
      // ÇALIŞAN GÜNCELLE
      //
      // employee.id + restaurant_id birlikte kullanılıyor.
      // Böylece URL/client üzerinden başka restoranın
      // çalışanını değiştirme ihtimali azaltılıyor.
      // =====================================================

      const {
        data: updatedEmployee,
        error: updateError,
      } = await supabase
        .from("employees")
        .update({
          name: cleanName,
          phone: cleanPhone || null,
          role,
          is_active: isActive,
        })
        .eq("id", employee.id)
        .eq(
          "restaurant_id",
          membership.restaurant_id
        )
        .select(
          "id, restaurant_id, name, role, phone, is_active"
        )
        .maybeSingle();

      if (updateError) {
        console.error(
          "Çalışan güncelleme hatası:",
          updateError
        );

        setError(
          "Çalışan güncellenemedi: " +
            updateError.message
        );

        return;
      }

      if (!updatedEmployee) {
        setError(
          "Çalışan güncellenemedi. Çalışan bu işletmeye ait olmayabilir veya Supabase RLS izinleri engelliyor olabilir."
        );

        return;
      }

      setSuccess(
        "✓ Çalışan bilgileri başarıyla güncellendi."
      );

      setName(updatedEmployee.name);
      setPhone(updatedEmployee.phone || "");
      setRole(updatedEmployee.role);
      setIsActive(updatedEmployee.is_active);

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

  async function handleDelete() {
    const confirmed = window.confirm(
      `"${employee.name}" isimli çalışanı tamamen silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.\n\nÇalışanı sadece devre dışı bırakmak istiyorsanız iptal edip "Çalışan aktif" seçeneğini kapatabilirsiniz.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

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

      if (
        membershipError ||
        !membership?.restaurant_id
      ) {
        setError(
          "Kullanıcının bağlı olduğu işletme bulunamadı."
        );

        return;
      }

      // =====================================================
      // ÇALIŞANI SİL
      // =====================================================

      const {
        data: deletedEmployee,
        error: deleteError,
      } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id)
        .eq(
          "restaurant_id",
          membership.restaurant_id
        )
        .select("id")
        .maybeSingle();

      if (deleteError) {
        console.error(
          "Çalışan silme hatası:",
          deleteError
        );

        setError(
          "Çalışan silinemedi: " +
            deleteError.message
        );

        return;
      }

      if (!deletedEmployee) {
        setError(
          "Çalışan silinemedi. Çalışan bu işletmeye ait olmayabilir veya Supabase RLS izinleri engelliyor olabilir."
        );

        return;
      }

      router.push("/admin/calisanlar");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Çalışan silinirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setDeleting(false);
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
      {/* =================================================
          HEADER
      ================================================= */}

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
          Çalışan Düzenle
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            color: "#777",
          }}
        >
          {employee.name} çalışanının bilgilerini
          güncelleyin.
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
              maxLength={100}
              required
              style={inputStyle}
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
            <span style={labelStyle}>
              Telefon
            </span>

            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="05XX XXX XX XX"
              maxLength={30}
              style={inputStyle}
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
            <span style={labelStyle}>
              Görev
            </span>

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
              style={inputStyle}
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
          </label>

          {/* =================================================
              AKTİF / PASİF
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
                  setIsActive(
                    event.target.checked
                  )
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
                  Pasif yaptığınız çalışan işletme
                  listesinde pasif olarak görünür.
                </small>
              </span>
            </label>
          </div>

          {/* =================================================
              MESAJLAR
          ================================================= */}

          {error && (
            <div
              role="alert"
              style={errorStyle}
            >
              ❌ {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              style={successStyle}
            >
              {success}
            </div>
          )}

          {/* =================================================
              KAYDET
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
              style={secondaryButtonStyle}
            >
              Vazgeç
            </a>

            <button
              type="submit"
              disabled={loading || deleting}
              style={{
                ...primaryButtonStyle,
                background: loading
                  ? "#999"
                  : "#d49a16",
                cursor:
                  loading || deleting
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "Kaydediliyor..."
                : "✓ Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>

        {/* =================================================
            TEHLİKELİ BÖLGE
        ================================================= */}

        <div
          style={{
            marginTop: "30px",
            paddingTop: "22px",
            borderTop: "1px solid #eee",
          }}
        >
          <div
            style={{
              color: "#b42318",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1.5px",
              marginBottom: "6px",
            }}
          >
            TEHLİKELİ BÖLGE
          </div>

          <h3
            style={{
              margin: "0 0 7px",
              fontSize: "16px",
            }}
          >
            Çalışanı tamamen kaldır
          </h3>

          <p
            style={{
              margin: "0 0 14px",
              fontSize: "12px",
              color: "#777",
              lineHeight: 1.6,
            }}
          >
            Çalışanı silmek yerine pasif yapmak
            genellikle daha güvenlidir. Silme işlemi
            geri alınamaz.
          </p>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleting}
            style={{
              border: "1px solid #e2aaa5",
              background:
                loading || deleting
                  ? "#eee"
                  : "#fff5f4",
              color:
                loading || deleting
                  ? "#999"
                  : "#b42318",
              padding: "11px 16px",
              borderRadius: "9px",
              cursor:
                loading || deleting
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 800,
            }}
          >
            {deleting
              ? "Siliniyor..."
              : "🗑️ Çalışanı Sil"}
          </button>
        </div>
      </section>
    </main>
  );
}

/*
 * =====================================================
 * STYLES
 * =====================================================
 */

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#292929",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  border: "1px solid #d9d4cc",
  borderRadius: "10px",
  background: "#fff",
  color: "#171717",
  fontSize: "14px",
};

const errorStyle: React.CSSProperties = {
  marginBottom: "17px",
  padding: "13px 15px",
  borderRadius: "11px",
  background: "#fff0f0",
  border: "1px solid #efb1b1",
  color: "#b42318",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.5,
};

const successStyle: React.CSSProperties = {
  marginBottom: "17px",
  padding: "13px 15px",
  borderRadius: "11px",
  background: "#eefbf2",
  border: "1px solid #b7e3c2",
  color: "#16743a",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.5,
};

const secondaryButtonStyle: React.CSSProperties = {
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
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: "44px",
  padding: "11px 20px",
  border: "none",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "12px",
  fontWeight: 900,
  boxShadow: "0 8px 18px rgba(0,0,0,.10)",
};
