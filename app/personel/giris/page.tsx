import { redirect } from "next/navigation";
import { checkStaffSession } from "../../../lib/staff";
import StaffLoginForm from "./StaffLoginForm";

// Garson ve mutfak girişi. Zaten giriş yapılmışsa ekrana yönlendirir.
export default async function StaffLoginPage() {
  const check = await checkStaffSession();
  if (check.ok) redirect("/personel");
  return <StaffLoginForm />;
}
