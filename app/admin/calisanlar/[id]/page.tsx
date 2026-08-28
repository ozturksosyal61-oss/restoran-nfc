import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { notFound } from "next/navigation";
import EditEmployeeForm from "./EditEmployeeForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEmployeePage({
  params,
}: Props) {
  const { id } = await params;

  const employeeId = Number(id);

  if (!Number.isInteger(employeeId)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership?.restaurant_id) {
    notFound();
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .select(
      "id, restaurant_id, name, role, phone, is_active"
    )
    .eq("id", employeeId)
    .eq("restaurant_id", membership.restaurant_id)
    .single();

  if (error || !employee) {
    notFound();
  }

  return (
    <EditEmployeeForm
      employee={employee}
    />
  );
}