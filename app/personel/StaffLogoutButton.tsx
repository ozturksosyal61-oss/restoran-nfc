"use client";

import { useState } from "react";
import AdminIcon from "../admin/AdminIcon";
import { disablePush } from "../../lib/push-client";
import { createClient } from "../../lib/supabase/client";

export default function StaffLogoutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    // Mesai bitince bu telefona bildirim gitmesin (yeniden girişte kendiliğinden açılır).
    await disablePush({ keepPreference: true });
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
