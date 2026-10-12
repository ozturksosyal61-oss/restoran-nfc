import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { planGate } from "../../../../lib/admin-plan";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

// Salon yerleşimini kaydeder: masaların konumu, şekli, kişi sayısı ve bölümü.
// Yalnızca istekte gelen ve bu restorana ait masalar güncellenir.

const SHAPES = new Set(["kare", "yuvarlak", "uzun"]);
const MAX_TABLES = 300;

type LayoutRow = { id: number; shape: string; seats: number; x: number | null; y: number | null; zone: string | null };

function position(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? Math.round(number * 10) / 10 : undefined;
}

function readRow(value: unknown): LayoutRow | null {
  const row = value as Record<string, unknown> | null;
  const id = Number(row?.id);
  const seats = Number(row?.seats);
  const shape = String(row?.shape ?? "");
  const x = position(row?.x);
  const y = position(row?.y);
  const zoneText = typeof row?.zone === "string" ? row.zone.replace(/\s+/g, " ").trim() : "";
  if (!Number.isInteger(id) || id <= 0 || !SHAPES.has(shape)) return null;
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) return null;
  if (x === undefined || y === undefined || (x === null) !== (y === null)) return null;
  if (zoneText.length > 40) return null;
  return { id, shape, seats, x, y, zone: zoneText || null };
}

export async function POST(request: Request) {
  const admin = await getAdminRestaurant();
  if (!admin) return Response.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
  if (admin.isDemo) return Response.json({ ok: false, message: DEMO_BLOCKED_MESSAGE }, { status: 403 });

  const locked = await planGate(admin, "orders");
  if (locked) return Response.json({ ok: false, message: locked }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { tables?: unknown } | null;
  const input = Array.isArray(body?.tables) ? body.tables.slice(0, MAX_TABLES) : [];
  const rows = input.map(readRow);
  if (rows.length === 0 || rows.some((row) => row === null)) {
    return Response.json({ ok: false, message: "Yerleşim bilgisi geçersiz." }, { status: 400 });
  }

  const db = createSupabaseAdminClient();
  const results = await Promise.all(
    (rows as LayoutRow[]).map((row) =>
      db
        .from("restaurant_tables")
        .update({ shape: row.shape, seats: row.seats, pos_x: row.x, pos_y: row.y, zone: row.zone })
        .eq("id", row.id)
        .eq("restaurant_id", admin.restaurantId)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("Salon yerleşimi kaydedilemedi", failed.error);
    const missing = /column|schema cache/i.test(failed.error.message);
    return Response.json(
      {
        ok: false,
        message: missing
          ? "Salon yerleşimi için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin."
          : "Yerleşim kaydedilemedi. Lütfen tekrar deneyin.",
      },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, message: "Yerleşim kaydedildi." });
}
