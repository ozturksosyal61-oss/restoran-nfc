import { NextResponse } from "next/server";

// Eski "deneme başlat" uç noktası kapatıldı. İşletme yöneticisinin kendi
// isteğiyle abonelik kaydı açması güvenlik denetiminde gereksiz bulundu
// (2026-10). Abonelik artık yalnızca sistem panelinden ya da otomatik
// ödemede işletme panelindeki Abonelik sayfasından (/admin/abonelik) başlar.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Abonelik işlemleri artık işletme panelindeki Abonelik sayfasından ya da OZT Digital üzerinden yapılır.",
    },
    { status: 410 }
  );
}
