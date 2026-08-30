import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

type Employee = {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  is_active: boolean | null;
  created_at: string;
};

function roleLabel(role: string) {
  switch (role) {
    case "garson":
      return "Garson";
    case "mutfak":
      return "Mutfak";
    case "yonetici":
      return "Yönetici";
    default:
      return role || "Belirtilmemiş";
  }
}

function roleIcon(role: string) {
  switch (role) {
    case "garson":
      return "🧑‍🍽️";
    case "mutfak":
      return "👨‍🍳";
    case "yonetici":
      return "👔";
    default:
      return "👤";
  }
}

function roleStyle(role: string): React.CSSProperties {
  if (role === "yonetici") {
    return {
      background: "#fff7df",
      color: "#946b00",
      border: "1px solid #ead59a",
    };
  }

  if (role === "mutfak") {
    return {
      background: "#fff0e8",
      color: "#a54820",
      border: "1px solid #f0c5af",
    };
  }

  return {
    background: "#edf5ff",
    color: "#245d91",
    border: "1px solid #c8def3",
  };
}

export default async function CalisanlarPage() {
  const supabase = await createSupabaseServerClient();

  // =====================================================
  // GİRİŞ YAPAN KULLANICI
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="admin-page">
        <section className="admin-form">
          <h1>Oturum bulunamadı</h1>
          <p>Lütfen tekrar giriş yapın.</p>
          <Link href="/admin">← Yönetim Paneli</Link>
        </section>
      </main>
    );
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

  if (membershipError || !membership?.restaurant_id) {
    return (
      <main className="admin-page">
        <section className="admin-form">
          <h1>İşletme bulunamadı</h1>
          <p>
            Bu kullanıcı herhangi bir işletmeye bağlı değil.
          </p>
          <Link href="/admin">← Yönetim Paneli</Link>
        </section>
      </main>
    );
  }

  const restaurantId = membership.restaurant_id;

  // =====================================================
  // RESTORAN
  // =====================================================

  const { data: restaurant, error: restaurantError } =
    await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .single();

  if (restaurantError || !restaurant) {
    return (
      <main className="admin-page">
        <section className="admin-form">
          <h1>İşletme bilgileri bulunamadı</h1>
          <p>Restoran bilgileriniz yüklenemedi.</p>
          <Link href="/admin">← Yönetim Paneli</Link>
        </section>
      </main>
    );
  }

  // =====================================================
  // ÇALIŞANLAR
  // =====================================================

  const { data: employeesData, error } = await supabase
    .from("employees")
    .select(
      "id, name, role, phone, is_active, created_at"
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", {
      ascending: false,
    });

  const employees = (employeesData || []) as Employee[];

  // =====================================================
  // İSTATİSTİKLER
  // =====================================================

  const activeEmployees = employees.filter(
    (employee) => employee.is_active !== false
  );

  const inactiveEmployees = employees.filter(
    (employee) => employee.is_active === false
  );

  const managerCount = employees.filter(
    (employee) => employee.role === "yonetici"
  ).length;

  const kitchenCount = employees.filter(
    (employee) => employee.role === "mutfak"
  ).length;

  const waiterCount = employees.filter(
    (employee) => employee.role === "garson"
  ).length;

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
        <Link
          href="/admin"
          style={{
            display: "inline-block",
            marginBottom: "16px",
            color: "#777",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          ← Yönetim Paneli
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#c58d08",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "1.7px",
                marginBottom: "7px",
              }}
            >
              İŞLETME YÖNETİMİ
            </div>

            <h1
              style={{
                margin: 0,
              }}
            >
              Çalışanlar
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#777",
              }}
            >
              {restaurant.name} çalışanlarını yönetin.
            </p>
          </div>

          <Link
            href="/admin/calisanlar/yeni"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px 18px",
              borderRadius: "11px",
              background: "#d49a16",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 900,
              fontSize: "13px",
              boxShadow: "0 8px 20px rgba(0,0,0,.10)",
            }}
          >
            ＋ Yeni Çalışan
          </Link>
        </div>
      </section>

      {/* =================================================
          HATA
      ================================================= */}

      {error && (
        <section
          style={{
            background: "#fff0f0",
            border: "1px solid #efb1b1",
            color: "#b42318",
            borderRadius: "14px",
            padding: "14px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          ❌ Çalışanlar yüklenemedi: {error.message}
        </section>
      )}

      {/* =================================================
          ÖZET KARTLARI
      ================================================= */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(170px,1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <SummaryCard
          icon="👥"
          title="Toplam"
          value={employees.length}
          description="Çalışan"
        />

        <SummaryCard
          icon="🟢"
          title="Aktif"
          value={activeEmployees.length}
          description="Aktif çalışan"
        />

        <SummaryCard
          icon="👔"
          title="Yönetici"
          value={managerCount}
          description="Yönetici"
        />

        <SummaryCard
          icon="👨‍🍳"
          title="Mutfak"
          value={kitchenCount}
          description="Mutfak"
        />

        <SummaryCard
          icon="🧑‍🍽️"
          title="Garson"
          value={waiterCount}
          description="Garson"
        />
      </section>

      {/* =================================================
          ROLLER
      ================================================= */}

      {employees.length > 0 && (
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e0d8",
            borderRadius: "18px",
            padding: "18px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1.5px",
              color: "#9a9489",
              marginBottom: "10px",
            }}
          >
            ROLLER
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span
              style={{
                ...roleStyle("yonetici"),
                padding: "7px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              👔 Yönetici · {managerCount}
            </span>

            <span
              style={{
                ...roleStyle("mutfak"),
                padding: "7px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              👨‍🍳 Mutfak · {kitchenCount}
            </span>

            <span
              style={{
                ...roleStyle("garson"),
                padding: "7px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              🧑‍🍽️ Garson · {waiterCount}
            </span>

            {inactiveEmployees.length > 0 && (
              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: "999px",
                  background: "#f3f3f3",
                  border: "1px solid #ddd",
                  color: "#777",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                ⚪ Pasif · {inactiveEmployees.length}
              </span>
            )}
          </div>
        </section>
      )}

      {/* =================================================
          ÇALIŞAN LİSTESİ
      ================================================= */}

      <section
        className="admin-form"
        style={{
          background: "#fff",
          border: "1px solid #e5e0d8",
          borderRadius: "19px",
          padding: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <div
              style={{
                color: "#c58d08",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "1.5px",
                marginBottom: "5px",
              }}
            >
              EKİP
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "21px",
                fontWeight: 900,
              }}
            >
              Çalışan Listesi
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "13px",
              }}
            >
              Toplam {employees.length} çalışan
            </p>
          </div>

          {employees.length > 0 && (
            <Link
              href="/admin/calisanlar/yeni"
              style={{
                color: "#b37c00",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 900,
              }}
            >
              + Çalışan Ekle
            </Link>
          )}
        </div>

        {!employees.length ? (
          <div
            style={{
              padding: "45px 20px",
              textAlign: "center",
              border: "1px dashed #d8c8a5",
              borderRadius: "15px",
              background: "#faf8f2",
            }}
          >
            <div
              style={{
                fontSize: "44px",
                marginBottom: "10px",
              }}
            >
              👨‍🍳
            </div>

            <h3
              style={{
                margin: "0 0 7px",
              }}
            >
              Henüz çalışan yok
            </h3>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "13px",
              }}
            >
              İlk çalışanınızı ekleyerek ekip yönetimine
              başlayabilirsiniz.
            </p>

            <Link
              href="/admin/calisanlar/yeni"
              style={{
                display: "inline-flex",
                marginTop: "18px",
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              İlk Çalışanı Ekle
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {employees.map((employee) => (
              <div
                key={employee.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "18px",
                  padding: "16px",
                  border: "1px solid #e8e3db",
                  borderRadius: "14px",
                  background:
                    employee.is_active === false
                      ? "#fafafa"
                      : "#fff",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: 900,
                      }}
                    >
                      {roleIcon(employee.role)}{" "}
                      {employee.name}
                    </h3>

                    <span
                      style={{
                        ...roleStyle(employee.role),
                        padding: "5px 9px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {roleLabel(employee.role)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "7px",
                      color: "#777",
                      fontSize: "12px",
                    }}
                  >
                    {employee.phone && (
                      <span>
                        📞 {employee.phone}
                      </span>
                    )}

                    <span>
                      {employee.is_active === false
                        ? "⚪ Pasif"
                        : "🟢 Aktif"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                  }}
                >
                  <Link
                    href={`/admin/calisanlar/${employee.id}`}
                    style={{
                      padding: "9px 13px",
                      borderRadius: "9px",
                      border: "1px solid #ddd",
                      background: "#fff",
                      color: "#222",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    Düzenle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =================================================
          BİLGİ
      ================================================= */}

      <section
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          borderRadius: "13px",
          background: "#faf8f4",
          border: "1px solid #e6dfd4",
          color: "#777",
          fontSize: "11px",
          lineHeight: 1.6,
        }}
      >
        ℹ️ Çalışanlar yalnızca bu hesaba bağlı olan{" "}
        <strong style={{ color: "#333" }}>
          {restaurant.name}
        </strong>{" "}
        işletmesinden listelenir.
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e0d8",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "12px",
          background: "#f8f3e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "19px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            color: "#888",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {title}
        </div>

        <strong
          style={{
            display: "block",
            marginTop: "2px",
            fontSize: "21px",
            lineHeight: 1.1,
          }}
        >
          {value}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: "3px",
            color: "#aaa",
            fontSize: "10px",
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );
}
