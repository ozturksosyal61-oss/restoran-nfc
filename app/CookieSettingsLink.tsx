"use client";

import { COOKIE_SETTINGS_EVENT } from "../lib/legal";

// Site alt bilgisindeki "Çerez tercihleri": onay bandını ayarlarla yeniden açar.
export default function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
      style={{ padding: 0, border: 0, background: "none", color: "inherit", font: "inherit", cursor: "pointer" }}
    >
      Çerez tercihleri
    </button>
  );
}
