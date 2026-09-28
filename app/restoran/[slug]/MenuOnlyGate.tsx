"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

// Sadece menü restoranlarında menü dışındaki müşteri sayfaları (ana sayfa,
// sipariş, takip, ödeme, çalışan değerlendirme) açılmaz; ziyaretçi menüye
// yönlendirilir. Eski masa QR'ları ve kayıtlı bağlantılar da menüye düşer.
export default function MenuOnlyGate({
  menuPath,
  children,
}: {
  menuPath: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onMenu = pathname === menuPath || pathname.startsWith(`${menuPath}/`);

  useEffect(() => {
    if (!onMenu) router.replace(menuPath);
  }, [onMenu, menuPath, router]);

  return onMenu ? <>{children}</> : null;
}
