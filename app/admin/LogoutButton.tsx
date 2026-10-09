"use client";

import { useRouter } from "next/navigation";
import { disablePush } from "../../lib/push-client";
import { createClient } from "../../lib/supabase/client";

export default function LogoutButton() {
    const supabase = createClient();
    const router = useRouter();

  async function handleLogout() {
    await disablePush({ keepPreference: true });
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="logout-button">
      Çıkış Yap
    </button>
  );
}