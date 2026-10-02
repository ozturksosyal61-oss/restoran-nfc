"use client";

import { useState } from "react";
import AdminIcon from "../admin/AdminIcon";
import { createClient } from "../../lib/supabase/client";

export default function StaffLogoutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.assign("/personel/giris");
  }

  return (
    <button
      type="button"
      className={compact ? "adm-btn adm-btn-sm stf-logout" : "adm-btn"}
      onClick={() => void logout()}
      disabled={busy}
    >
      <AdminIcon name="logout" size={15} />
      {busy ? "Çıkış yapılıyor…" : "Çıkış yap"}
    </button>
  );
}
