import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { loadEmployeePhones } from "../../../../lib/employee-phones";
import { headers } from "next/headers";
import { readMenuOnly } from "../../../../lib/restaurant-type";
import { planAllowsStaff } from "../../../../lib/staff";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import EditEmployeeForm from "./EditEmployeeForm";
import StaffLoginCard from "./StaffLoginCard";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEmployeePage({
  params,
}: Props) {
  // =====================================================
  // URL'DEKİ ÇALIŞAN ID
  // =====================================================

  const { id } = await params;
  const employeeId = Number(id);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  // =====================================================
  // GİRİŞ YAPAN KULLANICI
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
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

  if (
    membershipError ||
    !membership?.restaurant_id
  ) {
    notFound();
  }

  const restaurantId = membership.restaurant_id;

  // =====================================================
  // ÇALIŞAN
  //
  // ÖNEMLİ:
  // employeeId + restaurantId birlikte kontrol ediliyor.
  // Böylece bir kullanıcı URL'yi değiştirerek başka
  // restoranın çalışanını açamaz.
  // =====================================================

  const [{ data: employee, error: employeeError }, phones] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, restaurant_id, name, role, is_active")
        .eq("id", employeeId)
        .eq("restaurant_id", restaurantId)
        .single(),
      loadEmployeePhones(supabase, Number(restaurantId)),
    ]);

  if (employeeError || !employee) {
    notFound();
  }

  // =====================================================
  // GARSON / MUTFAK GİRİŞ HESABI
  // staff_accounts yalnızca sunucudan okunur; çalışan bu restorana ait
  // olduğu yukarıda doğrulandı.
  // =====================================================

  const [{ data: restaurant }, menuOnly, { data: account }, headerList] = await Promise.all([
    supabase.from("restaurants").select("plan").eq("id", restaurantId).maybeSingle(),
    readMenuOnly(supabase, Number(restaurantId)),
    createSupabaseAdminClient()
      .from("staff_accounts")
      .select("email, is_active, last_seen_at")
      .eq("employee_id", employeeId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    headers(),
  ]);

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "www.oztdigital.com.tr";

  return (
    <EditEmployeeForm
      employee={{
        ...employee,
        phone: phones.get(employeeId) ?? null,
      }}
      extra={
        <StaffLoginCard
          employeeId={employeeId}
          role={String(employee.role)}
          account={account ?? null}
          allowed={planAllowsStaff(restaurant?.plan, menuOnly)}
          loginUrl={`${host.replace(/^www\./, "")}/personel/giris`}
        />
      }
    />
  );
}
