import { createSupabaseAdminClient } from "./supabase-admin";

// Haftalık rapor e-postasından çıkış. Bağlantıdaki rastgele kod restoranı
// tanımlar; giriş gerekmez.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findReportSubscription(token: string | undefined | null) {
  if (!token || !UUID.test(token)) return null;
  const { data } = await createSupabaseAdminClient()
    .from("restaurants")
    .select("id, name, report_email_enabled")
    .eq("report_unsubscribe_token", token)
    .maybeSingle();
  return data ? { id: Number(data.id), name: String(data.name), enabled: data.report_email_enabled === true } : null;
}

export async function stopWeeklyReport(token: string | undefined | null) {
  const subscription = await findReportSubscription(token);
  if (!subscription) return null;
  const { error } = await createSupabaseAdminClient()
    .from("restaurants")
    .update({ report_email_enabled: false })
    .eq("id", subscription.id);
  return error ? null : subscription;
}
