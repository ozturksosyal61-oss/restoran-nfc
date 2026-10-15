import { emailConfigured, sendEmails, type EmailMessage } from "./email";
import { resolveSummary } from "./report-periods";
import { createSupabaseAdminClient } from "./supabase-admin";
import {
  hasActivity,
  loadWeeklyReport,
  renderWeeklyReport,
  oneClickUnsubscribeUrl,
  type WeeklyReportRestaurant,
} from "./weekly-report";

// Haftalık rapor gönderimi. Yalnızca sunucuda (zamanlanmış görev ve
// paneldeki "deneme gönder"). Service role ile çalışır; çağıran yetkiyi
// kendisi doğrular.

type Row = WeeklyReportRestaurant & {
  report_email: string | null;
  report_email_sent_week: string | null;
};

const COLUMNS = "id, name, plan, menu_only, report_email, report_email_sent_week, report_unsubscribe_token";

// Aynı anda hazırlanan rapor sayısı (veritabanını yormamak için).
const CONCURRENCY = 4;

async function ownerEmails(admin: ReturnType<typeof createSupabaseAdminClient>, restaurantIds: number[]) {
  const { data } = await admin
    .from("restaurant_users")
    .select("restaurant_id, user_id")
    .in("restaurant_id", restaurantIds);

  const emails = new Map<number, string>();
  for (const row of data ?? []) {
    const id = Number(row.restaurant_id);
    if (emails.has(id)) continue;
    const { data: user } = await admin.auth.admin.getUserById(String(row.user_id));
    if (user?.user?.email) emails.set(id, user.user.email);
  }
  return emails;
}

async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  }
  return results;
}

export type WeeklyRunResult = {
  week: string;
  candidates: number;
  sent: number;
  quiet: number;
  noRecipient: number;
  errors: string[];
};

export async function runWeeklyReports(options: {
  // Yalnızca bu restoran(lar).
  restaurantIds?: number[];
  // Bu hafta gönderilmiş olsa da yeniden gönder (deneme).
  force?: boolean;
  // Alıcıyı geçersiz kıl (deneme gönderimi).
  to?: string;
  now?: Date;
} = {}): Promise<WeeklyRunResult> {
  const now = options.now ?? new Date();
  const week = resolveSummary("hafta", undefined, now).key;
  const result: WeeklyRunResult = { week, candidates: 0, sent: 0, quiet: 0, noRecipient: 0, errors: [] };

  if (!emailConfigured()) {
    result.errors.push("RESEND_API_KEY tanımlı değil.");
    return result;
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("restaurants")
    .select(COLUMNS)
    .eq("is_active", true)
    .eq("is_demo", false);

  if (options.restaurantIds?.length) query = query.in("id", options.restaurantIds);
  else query = query.eq("report_email_enabled", true);

  const { data, error } = await query;
  if (error) {
    result.errors.push(`Restoranlar okunamadı: ${error.message}`);
    return result;
  }

  const rows = ((data ?? []) as unknown as Row[]).filter(
    (row) => options.force || row.report_email_sent_week !== week
  );
  result.candidates = rows.length;
  if (rows.length === 0) return result;

  const owners = await ownerEmails(
    admin,
    rows.filter((row) => !row.report_email).map((row) => Number(row.id))
  );

  const prepared = await inBatches(rows, CONCURRENCY, async (row) => {
    const to = options.to || row.report_email || owners.get(Number(row.id));
    if (!to) return { row, status: "noRecipient" as const };

    const report = await loadWeeklyReport(admin, { ...row, id: Number(row.id) }, now);
    // Deneme gönderiminde sessiz hafta da gönderilir (nasıl göründüğü görülsün).
    if (!options.to && !hasActivity(report)) return { row, status: "quiet" as const };

    const message: EmailMessage = {
      to,
      ...renderWeeklyReport(report),
      unsubscribeUrl: oneClickUnsubscribeUrl(row.report_unsubscribe_token),
    };
    return { row, status: "ready" as const, message };
  });

  const ready = prepared.filter((item) => item.status === "ready");
  result.quiet = prepared.filter((item) => item.status === "quiet").length;
  result.noRecipient = prepared.filter((item) => item.status === "noRecipient").length;

  const { sent, errors } = await sendEmails(ready.map((item) => item.message!));
  result.errors.push(...errors);
  result.sent = sent.filter(Boolean).length;

  // Gönderilenler ve sessiz haftalar bu hafta için işaretlenir (deneme hariç).
  if (!options.to) {
    const done = [
      ...ready.filter((_, index) => sent[index]).map((item) => Number(item.row.id)),
      ...prepared.filter((item) => item.status === "quiet").map((item) => Number(item.row.id)),
    ];
    if (done.length > 0) {
      const { error: markError } = await admin
        .from("restaurants")
        .update({ report_email_sent_week: week })
        .in("id", done);
      if (markError) result.errors.push(`Gönderim işaretlenemedi: ${markError.message}`);
    }
  }

  return result;
}
