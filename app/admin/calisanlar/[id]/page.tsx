import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import EditEmployeeForm from "./EditEmployeeForm";

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

  const { data: employee, error: employeeError } =
    await supabase
      .from("employees")
      .select(
        "id, restaurant_id, name, role, phone, is_active"
      )
      .eq("id", employeeId)
      .eq("restaurant_id", restaurantId)
      .single();

  if (employeeError || !employee) {
    notFound();
  }

  return (
    <EditEmployeeForm
      employee={employee}
    />
  );
}
