"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/sistem/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="system-logout-button"
    >
      🚪 Çıkış Yap
    </button>
  );
}