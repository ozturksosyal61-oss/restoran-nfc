"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { CONTACT_STATUSES, CONTACT_TOPICS, type ContactRequest } from "../../../lib/contact";

// İletişim talepleri: durum, not, saha satışa aktarma, silme.

function requestId(formData: FormData) {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function refresh() {
  revalidatePath("/sistem/iletisim");
}

export async function setContactStatus(formData: FormData) {
  await requireSystemAdmin();
  const id = requestId(formData);
  const status = String(formData.get("status") ?? "");
  if (!id || !CONTACT_STATUSES.some((item) => item.value === status)) return;
  await createSupabaseAdminClient()
    .from("contact_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

export async function saveContactNote(formData: FormData) {
  await requireSystemAdmin();
  const id = requestId(formData);
  if (!id) return;
  const note = String(formData.get("admin_note") ?? "").trim().slice(0, 1000) || null;
  await createSupabaseAdminClient()
    .from("contact_requests")
    .update({ admin_note: note, updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

export async function deleteContactRequest(formData: FormData) {
  await requireSystemAdmin();
  const id = requestId(formData);
  if (!id) return;
  await createSupabaseAdminClient().from("contact_requests").delete().eq("id", id);
  refresh();
}

// Talebi saha satışta bir işletme kaydına çevirir; kayıt sayfasına gider.
export async function convertToLead(formData: FormData) {
  const { user } = await requireSystemAdmin();
  const id = requestId(formData);
  if (!id) return;
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("contact_requests")
    .select("id, name, business_name, phone, email, city, topic, message, lead_id, created_at")
    .eq("id", id)
    .maybeSingle();
  const request = data as ContactRequest | null;
  if (!request) return;
  if (request.lead_id) redirect(`/sistem/saha/${request.lead_id}`);

  const topic = CONTACT_TOPICS.find((item) => item.value === request.topic)?.label ?? "";
  const note = [
    `İletişim formu: ${topic}`,
    request.email ? `E-posta: ${request.email}` : null,
    request.message ? `Mesaj: ${request.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: lead, error } = await admin
    .from("sales_leads")
    .insert({
      name: (request.business_name || request.name).slice(0, 120),
      contact_name: request.name,
      phone: request.phone,
      district: request.city,
      note: note.slice(0, 1000),
      stage: "yeni",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !lead) return;

  await admin.from("sales_visits").insert({
    lead_id: lead.id,
    channel: "sistem",
    note: "Web sitesindeki iletişim formundan geldi.",
    created_by: user.id,
  });
  await admin
    .from("contact_requests")
    .update({ lead_id: lead.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  refresh();
  revalidatePath("/sistem/saha");
  redirect(`/sistem/saha/${lead.id}`);
}
