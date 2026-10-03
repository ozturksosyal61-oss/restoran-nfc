import { NextResponse } from "next/server";

// Eski "aboneliği iptal et" uç noktası kapatıldı (2026-10 güvenlik denetimi).
// Otomatik ödemedeki restoran işletme panelindeki Abonelik sayfasından,
// elle yönetilen restoran OZT Digital üzerinden iptal eder.
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Abonelik iptali artık işletme panelindeki Abonelik sayfasından ya da OZT Digital üzerinden yapılır.",
    },
    { status: 410 }
  );
}
