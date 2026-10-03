import { redirect } from "next/navigation";

// Tema ve menü düzeni yalnızca sistem panelinden belirlenir; işletme
// panelinde ayrı bir tema sayfası yoktur. Eski bağlantılar ayarlara gider.
export default function ThemeSettingsPage() {
  redirect("/admin/ayarlar");
}
