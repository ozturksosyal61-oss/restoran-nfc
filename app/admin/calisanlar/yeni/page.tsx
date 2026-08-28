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

    if (!name.trim()) {
      setError("Çalışan adı zorunludur.");
      return;
    }

    setLoading(true);

    try {
      // Giriş yapan kullanıcıyı bul
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Oturum bulunamadı.");
        setLoading(false);
        return;
      }

      // Kullanıcının restoranını bul
      const { data: membership, error: membershipError } =
        await supabase
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
        setLoading(false);
        return;
      }

      // Çalışanı oluştur
      const { error: insertError } =
        await supabase
          .from("employees")
          .insert({
            restaurant_id:
              membership.restaurant_id,
            name: name.trim(),
            phone: phone.trim() || null,
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

        setLoading(false);
        return;
      }

      // Çalışan listesine dön
      router.push("/admin/calisanlar");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Beklenmeyen bir hata oluştu."
      );

      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-header">
        <a href="/admin/calisanlar">
          ← Çalışanlara Dön
        </a>

        <h1>Yeni Çalışan</h1>

        <p>
          İşletmenize yeni bir çalışan ekleyin.
        </p>
      </section>

      <section className="admin-form">
        <form onSubmit={handleSubmit}>
          <label>
            Ad Soyad

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Örn. Ahmet Yılmaz"
              required
            />
          </label>

          <label>
            Telefon

            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="05XX XXX XX XX"
            />
          </label>

          <label>
            Görev

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
            >
              <option value="garson">
                Garson
              </option>

              <option value="mutfak">
                Mutfak
              </option>

              <option value="yonetici">
                Yönetici
              </option>
            </select>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
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
              }}
            />

            <span>Çalışan aktif</span>
          </label>

          {error && (
            <p className="login-error">
              ❌ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Çalışan Ekleniyor..."
              : "Çalışanı Kaydet"}
          </button>
        </form>
      </section>
    </main>
  );
}