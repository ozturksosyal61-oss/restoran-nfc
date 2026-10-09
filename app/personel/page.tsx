import { redirect } from "next/navigation";
import AdminIcon from "../admin/AdminIcon";
import { checkStaffSession, STAFF_DENIED_TEXT } from "../../lib/staff";
import { loadStaffBoard } from "../../lib/staff-board";
import StaffBoardView from "./StaffBoardView";
import StaffLogoutButton from "./StaffLogoutButton";

export const dynamic = "force-dynamic";

// Garson ya da mutfak ekranı; hangisinin açılacağı çalışanın görevinden belirlenir.
export default async function StaffPage() {
  const check = await checkStaffSession();

  if (!check.ok) {
    if (check.reason === "no-user") redirect("/personel/giris");
    // İşletme yöneticisi kendi paneline gider.
    if (check.reason === "not-staff") redirect("/admin");

    return (
      <main className="stf-denied">
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name="lock" />
          </span>
          <strong>Ekran açılamadı</strong>
          <p>{STAFF_DENIED_TEXT[check.reason]}</p>
          <StaffLogoutButton />
        </div>
      </main>
    );
  }

  const board = await loadStaffBoard(check.session);

  return (
    <StaffBoardView
      initialBoard={board}
      restaurantId={check.session.restaurantId}
      name={check.session.name}
      restaurantName={check.session.restaurantName}
    />
  );
}
