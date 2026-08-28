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

    const { error } = await supabase
      .from("employees")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        role,
        is_active: isActive,
      })
      .eq("id", employee.id);

    if (error) {
      console.error(
        "Çalışan güncelleme hatası:",
        error
      );

      setError(
        "Çalışan güncellenemedi: " +
          error.message
      );

      setLoading(false);
      return;
    }

    router.push("/admin/calisanlar");
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `"${employee.name}" isimli çalışanı silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", employee.id);

    if (error) {
      console.error(
        "Çalışan silme hatası:",
        error
      );

      setError(
        "Çalışan silinemedi: " +
          error.message
      );

      setDeleting(false);
      return;
    }

    router.push("/admin/calisanlar");
    router.refresh();
  }

  return (
    <main className="admin-page">
      <section className="admin-header">
        <a href="/admin/calisanlar">
          ← Çalışanlara Dön
        </a>

        <h1>Çalışan Düzenle</h1>

        <p>
          Çalışan bilgilerini güncelleyin.
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
            disabled={loading || deleting}
          >
            {loading
              ? "Kaydediliyor..."
              : "Değişiklikleri Kaydet"}
          </button>
        </form>

        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
          }}
        >
          <h3>Tehlikeli Bölge</h3>

          <p
            style={{
              fontSize: "14px",
              color: "#777",
            }}
          >
            Bu çalışanı işletmenizden tamamen
            kaldırabilirsiniz.
          </p>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleting}
            style={{
              background: "#b42318",
              color: "white",
              border: "none",
              padding: "11px 16px",
              borderRadius: "9px",
              cursor:
                loading || deleting
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
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