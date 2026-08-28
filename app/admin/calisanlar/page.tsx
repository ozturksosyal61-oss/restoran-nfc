import { createServerSupabaseClient } from "../../../lib/supabase-server";

export default async function CalisanlarPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership?.restaurant_id) {
    return (
      <main className="admin-page">
        <section className="admin-form">
          <h1>İşletme bulunamadı</h1>
          <p>Bu kullanıcı herhangi bir işletmeye bağlı değil.</p>
        </section>
      </main>
    );
  }

  const restaurantId = membership.restaurant_id;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .single();

  const { data: employees, error } = await supabase
    .from("employees")
    .select(
      "id, name, role, phone, is_active, created_at"
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", {
      ascending: false,
    });

  return (
    <main className="admin-page">
      <section className="admin-header">
        <a href="/admin">← Yönetim Paneli</a>

        <h1>Çalışanlar</h1>

        <p>
          {restaurant?.name || "İşletmeniz"} çalışanlarını
          buradan yönetin.
        </p>
      </section>

      <section className="admin-form">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h2 style={{ marginBottom: "5px" }}>
              Çalışan Listesi
            </h2>

            <p style={{ margin: 0 }}>
              Toplam {employees?.length || 0} çalışan
            </p>
          </div>

          <a
            href="/admin/calisanlar/yeni"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              borderRadius: "10px",
              background: "#d49a16",
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            + Yeni Çalışan
          </a>
        </div>

        {error && (
          <p className="login-error">
            Çalışanlar yüklenemedi: {error.message}
          </p>
        )}

        {!employees || employees.length === 0 ? (
          <div
            style={{
              padding: "35px 20px",
              textAlign: "center",
              border: "1px dashed #d8c8a5",
              borderRadius: "14px",
              background: "#faf8f2",
            }}
          >
            <div style={{ fontSize: "40px" }}>
              👨‍🍳
            </div>

            <h3>Henüz çalışan yok</h3>

            <p>
              İlk çalışanınızı ekleyerek başlayabilirsiniz.
            </p>

            <a
              href="/admin/calisanlar/yeni"
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "11px 18px",
                borderRadius: "9px",
                background: "#111",
                color: "white",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              İlk Çalışanı Ekle
            </a>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {employees.map((employee) => (
              <div
                key={employee.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  padding: "18px",
                  border: "1px solid #e5dfd2",
                  borderRadius: "14px",
                  background: "white",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      marginBottom: "6px",
                    }}
                  >
                    👨‍🍳 {employee.name}
                  </h3>

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    {employee.role === "garson"
                      ? "Garson"
                      : employee.role === "mutfak"
                        ? "Mutfak"
                        : employee.role === "yonetici"
                          ? "Yönetici"
                          : employee.role}
                  </div>

                  {employee.phone && (
                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "13px",
                        color: "#777",
                      }}
                    >
                      📞 {employee.phone}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "20px",
                      background: employee.is_active
                        ? "#e8f5e9"
                        : "#f5f5f5",
                      color: employee.is_active
                        ? "#2e7d32"
                        : "#777",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {employee.is_active
                      ? "🟢 Aktif"
                      : "⚪ Pasif"}
                  </span>

                  <a
                    href={`/admin/calisanlar/${employee.id}`}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      color: "#222",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Düzenle
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}