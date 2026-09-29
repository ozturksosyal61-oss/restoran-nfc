"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

// Sadece menü restoranlarında menü ve değerlendirme dışındaki müşteri
// sayfaları (ana sayfa, sipariş, takip, ödeme, çalışan değerlendirme)
// açılmaz; ziyaretçi menüye yönlendirilir. Eski masa QR'ları ve kayıtlı
// bağlantılar da menüye düşer.
export default function MenuOnlyGate({
  menuPath,
  allowedPaths = [],
  children,
}: {
  menuPath: string;
  allowedPaths?: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = [menuPath, ...allowedPaths].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    if (!allowed) router.replace(menuPath);
  }, [allowed, menuPath, router]);

  return allowed ? <>{children}</> : null;
}
