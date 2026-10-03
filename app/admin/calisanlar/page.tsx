import Link from "next/link";
import { hasPlanFeature } from "../../../lib/plan";
import { readRestaurantPlan } from "../../../lib/plan-server";
import PlanLock from "../PlanLock";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { loadEmployeePhones } from "../../../lib/employee-phones";
import AdminIcon from "../AdminIcon";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";

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
      <main className="adm-page">
        <div className="adm-empty">
          <strong>Oturum bulunamadı</strong>
          <p>Lütfen tekrar giriş yapın.</p>
          <Link className="adm-btn" href="/admin">Panele dön</Link>
        </div>
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
      <main className="adm-page">
        <div className="adm-empty">
          <strong>İşletme bulunamadı</strong>
          <p>Bu kullanıcı herhangi bir işletmeye bağlı değil.</p>
          <Link className="adm-btn" href="/admin">Panele dön</Link>
        </div>
      </main>
    );
  }

  const restaurantId = membership.restaurant_id;

  if (!hasPlanFeature(await readRestaurantPlan(supabase, Number(restaurantId)), "multi_user")) {
    return <PlanLock feature="multi_user" title="Çalışanlar" eyebrow="İşletme" />;
  }

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
      <main className="adm-page">
        <div className="adm-empty">
          <strong>İşletme bilgileri bulunamadı</strong>
          <p>Restoran bilgileriniz yüklenemedi.</p>
          <Link className="adm-btn" href="/admin">Panele dön</Link>
        </div>
      </main>
    );
  }

  // =====================================================
  // ÇALIŞANLAR
  // =====================================================

  const [{ data: employeesData, error }, phones] = await Promise.all([
    supabase
      .from("employees")
      .select("id, name, role, is_active, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", {
        ascending: false,
      }),
    loadEmployeePhones(supabase, Number(restaurantId)),
  ]);

  // Garson / mutfak giriş hesapları (tablo yalnızca sunucudan okunur).
  const { data: accountRows } = await createSupabaseAdminClient()
    .from("staff_accounts")
    .select("employee_id, is_active")
    .eq("restaurant_id", restaurantId);
  const logins = new Map((accountRows ?? []).map((row) => [Number(row.employee_id), row.is_active !== false]));

  const employees: Employee[] = (employeesData || []).map((employee) => ({
    ...employee,
    phone: phones.get(Number(employee.id)) ?? null,
  }));

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
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">İşletme</span>
          <h1>Çalışanlar</h1>
          <p>Müşteriler değerlendirme ekranında aktif çalışanlarınızı seçip puan verebilir.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn adm-btn-primary" href="/admin/calisanlar/yeni">
            <AdminIcon name="plus" size={16} />
            Yeni çalışan
          </Link>
        </div>
      </header>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Çalışanlar yüklenemedi: {error.message}
        </p>
      )}

      <section className="adm-stats" aria-label="Ekip özeti">
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Toplam</span>
            <span className="adm-stat-icon"><AdminIcon name="staff" size={16} /></span>
          </div>
          <span className="adm-stat-value">{employees.length}</span>
          <span className="adm-stat-hint">{activeEmployees.length} aktif · {inactiveEmployees.length} pasif</span>
        </div>
        <div className="adm-stat tone-accent">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yönetici</span>
            <span className="adm-stat-icon"><AdminIcon name="user" size={16} /></span>
          </div>
          <span className="adm-stat-value">{managerCount}</span>
        </div>
        <div className="adm-stat tone-new">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Mutfak</span>
            <span className="adm-stat-icon"><AdminIcon name="chef" size={16} /></span>
          </div>
          <span className="adm-stat-value">{kitchenCount}</span>
        </div>
        <div className="adm-stat tone-ready">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Garson</span>
            <span className="adm-stat-icon"><AdminIcon name="bell" size={16} /></span>
          </div>
          <span className="adm-stat-value">{waiterCount}</span>
        </div>
      </section>

      {employees.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="staff" /></span>
          <strong>Henüz çalışan yok</strong>
          <p>Ekibinizi ekleyin; müşteriler size hizmet eden çalışanı değerlendirebilsin.</p>
          <Link className="adm-btn adm-btn-primary" href="/admin/calisanlar/yeni">
            <AdminIcon name="plus" size={16} />
            İlk çalışanı ekle
          </Link>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Çalışan</th>
                <th>Görev</th>
                <th>Telefon</th>
                <th>Durum</th>
                <th aria-label="İşlem" />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const passive = employee.is_active === false;
                return (
                  <tr key={employee.id} style={passive ? { opacity: 0.65 } : undefined}>
                    <td>
                      <span className="adm-person">
                        <span className="adm-review-avatar">
                          {employee.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
                        </span>
                        <strong>{employee.name}</strong>
                      </span>
                    </td>
                    <td>
                      <span className={`adm-badge ${roleBadge(employee.role)}`}>{roleLabel(employee.role)}</span>
                      {logins.has(Number(employee.id)) && (
                        <span
                          className={`adm-badge ${logins.get(Number(employee.id)) ? "s-ok" : ""}`}
                          style={{ marginLeft: 6 }}
                          title="Kendi ekranına giriş yapabilir"
                        >
                          {logins.get(Number(employee.id)) ? "Giriş açık" : "Giriş kapalı"}
                        </span>
                      )}
                    </td>
                    <td className="adm-muted">{employee.phone || "—"}</td>
                    <td>
                      <span className={`adm-badge is-dot ${passive ? "s-delivered" : "s-ok"}`}>
                        {passive ? "Pasif" : "Aktif"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link className="adm-btn adm-btn-sm" href={`/admin/calisanlar/${employee.id}`}>
                        <AdminIcon name="edit" size={15} />
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function roleBadge(role: string) {
  if (role === "yonetici") return "s-accent";
  if (role === "mutfak") return "s-pending";
  return "s-ready";
}
