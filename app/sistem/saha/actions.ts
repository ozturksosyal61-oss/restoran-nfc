"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { requireSystemAdmin } from "../../../lib/system-admin";
import {
  BUSINESS_TYPES,
  CHANNELS,
  CURRENT_MENUS,
  INTERESTS,
  LOST_REASONS,
  OFFER_PLANS,
  STAGES,
  labelOf,
  phoneDigits,
  stageOf,
} from "../../../lib/sales";

// Saha satış işlemleri. Her işlem önce sistem yöneticisi yetkisini doğrular;
// service role yalnızca bundan sonra kullanılır.

export type SalesResult = { ok: boolean; message: string } | null;

const PHOTO_BUCKET = "sales-photos";
const MISSING_TABLE = "Saha satış tabloları bulunamadı. 20261019_field_sales.sql dosyasını çalıştırın.";

function text(formData: FormData, key: string, max = 200) {
  const value = String(formData.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return value || null;
}

function longText(formData: FormData, key: string, max = 2000) {
  const value = String(formData.get(key) ?? "").trim().slice(0, max);
  return value || null;
}

function oneOf(list: readonly { value: string }[], value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  return list.some((item) => item.value === raw) ? raw : null;
}

function intOrNull(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

// datetime-local değeri ("2026-10-07T14:00") İstanbul saati kabul edilir.
function istanbulDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function errorMessage(error: { message?: string; code?: string } | null) {
  if (!error) return "Bilinmeyen hata";
  if (error.code === "42P01" || /relation .* does not exist|Could not find the table/i.test(error.message ?? "")) {
    return MISSING_TABLE;
  }
  return error.message ?? "Bilinmeyen hata";
}

function refresh(leadId?: number) {
  revalidatePath("/sistem/saha");
  revalidatePath("/sistem/saha/istatistik");
  if (leadId) revalidatePath(`/sistem/saha/${leadId}`);
}

// Aday bilgileri (oluşturma ve düzenleme ortak).
function leadFields(formData: FormData) {
  return {
    name: text(formData, "name", 120),
    business_type: oneOf(BUSINESS_TYPES, formData.get("business_type")) ?? "kafe",
    district: text(formData, "district", 80),
    address: text(formData, "address", 240),
    table_count: intOrNull(formData.get("table_count"), 0, 1000),
    contact_name: text(formData, "contact_name", 80),
    contact_role: text(formData, "contact_role", 60),
    phone: text(formData, "phone", 30),
    instagram: text(formData, "instagram", 120),
    current_menu: oneOf(CURRENT_MENUS, formData.get("current_menu")) ?? "bilinmiyor",
    competitor: text(formData, "competitor", 80),
    note: longText(formData, "note", 1000),
  };
}

async function addSystemVisit(leadId: number, note: string, userId: string) {
  await createSupabaseAdminClient()
    .from("sales_visits")
    .insert({ lead_id: leadId, channel: "sistem", note, created_by: userId });
}

/* ---------------- Mükerrer kayıt ---------------- */

export type DuplicateLead = { id: number; name: string; district: string | null; stage: string };

export async function findDuplicates(name: string, phone: string, excludeId?: number): Promise<DuplicateLead[]> {
  await requireSystemAdmin();
  const admin = createSupabaseAdminClient();
  const cleanName = name.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
  const digits = phoneDigits(phone);
  const lastDigits = digits.slice(-10);
  if (cleanName.length < 3 && lastDigits.length < 10) return [];

  const filters: string[] = [];
  if (cleanName.length >= 3) filters.push(`name.ilike.%${cleanName}%`);
  if (lastDigits.length === 10) filters.push(`phone.ilike.%${lastDigits.slice(-4)}%`);

  const { data, error } = await admin
    .from("sales_leads")
    .select("id, name, district, stage, phone")
    .or(filters.join(","))
    .limit(20);
  if (error || !data) return [];

  return data
    .filter((row) => row.id !== excludeId)
    .filter((row) => {
      const sameName = cleanName.length >= 3 && String(row.name).toLocaleLowerCase("tr-TR").includes(cleanName.toLocaleLowerCase("tr-TR"));
      const samePhone = lastDigits.length === 10 && phoneDigits(row.phone).endsWith(lastDigits);
      return sameName || samePhone;
    })
    .slice(0, 5)
    .map((row) => ({ id: Number(row.id), name: String(row.name), district: row.district ?? null, stage: String(row.stage) }));
}

/* ---------------- Aday oluştur / düzenle / sil ---------------- */

export async function createLead(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  const { user } = await requireSystemAdmin();
  const fields = leadFields(formData);
  if (!fields.name) return { ok: false, message: "İşletmenin adını yazın." };

  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const hasLocation = String(formData.get("latitude") ?? "") !== "" && Number.isFinite(latitude) && Number.isFinite(longitude);

  const firstNote = longText(formData, "first_note", 2000);
  const interest = oneOf(INTERESTS, formData.get("interest"));
  const followUpAt = istanbulDate(formData.get("follow_up_at"));
  const nextStep = text(formData, "next_step", 200);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("sales_leads")
    .insert({
      ...fields,
      stage: firstNote ? "gorusuldu" : "yeni",
      interest,
      latitude: hasLocation ? latitude : null,
      longitude: hasLocation ? longitude : null,
      next_action_at: followUpAt,
      next_action: followUpAt ? nextStep : null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };

  if (firstNote) {
    await admin.from("sales_visits").insert({
      lead_id: data.id,
      channel: oneOf(CHANNELS, formData.get("channel")) ?? "yuz_yuze",
      interest,
      note: firstNote,
      next_step: nextStep,
      created_by: user.id,
    });
  }

  refresh();
  redirect(`/sistem/saha/${data.id}`);
}

export async function updateLead(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Kayıt bulunamadı." };
  const fields = leadFields(formData);
  if (!fields.name) return { ok: false, message: "İşletmenin adını yazın." };

  const { error } = await createSupabaseAdminClient()
    .from("sales_leads")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };

  refresh(id);
  return { ok: true, message: "Bilgiler kaydedildi." };
}

export async function deleteLead(formData: FormData) {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const admin = createSupabaseAdminClient();

  const { data } = await admin.from("sales_leads").select("photos").eq("id", id).maybeSingle();
  const photos = (data?.photos ?? []) as string[];
  if (photos.length > 0) await admin.storage.from(PHOTO_BUCKET).remove(photos);
  await admin.from("sales_leads").delete().eq("id", id);

  refresh();
  redirect("/sistem/saha");
}

/* ---------------- Aşama ---------------- */

export async function setStage(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  const { user } = await requireSystemAdmin();
  const id = Number(formData.get("id"));
  const stage = oneOf(STAGES, formData.get("stage"));
  if (!Number.isInteger(id) || id <= 0 || !stage) return { ok: false, message: "Aşama seçin." };
  const lostReason = stage === "kaybedildi" ? oneOf(LOST_REASONS, formData.get("lost_reason")) : null;
  if (stage === "kaybedildi" && !lostReason) return { ok: false, message: "Kaybetme nedenini seçin." };

  const admin = createSupabaseAdminClient();
  const update: Record<string, unknown> = { stage, lost_reason: lostReason, updated_at: new Date().toISOString() };
  // Kapanan adayın takip hatırlatması kalmaz.
  if (stage === "kazanildi" || stage === "kaybedildi") {
    update.next_action_at = null;
    update.next_action = null;
  }
  const { error } = await admin.from("sales_leads").update(update).eq("id", id);
  if (error) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };

  await addSystemVisit(
    id,
    `Aşama: ${stageOf(stage).label}${lostReason ? ` (${labelOf(LOST_REASONS, lostReason)})` : ""}`,
    user.id
  );
  refresh(id);
  return { ok: true, message: `Aşama "${stageOf(stage).label}" olarak kaydedildi.` };
}

/* ---------------- Görüşme ---------------- */

export async function addVisit(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  const { user } = await requireSystemAdmin();
  const leadId = Number(formData.get("lead_id"));
  if (!Number.isInteger(leadId) || leadId <= 0) return { ok: false, message: "Kayıt bulunamadı." };

  const note = longText(formData, "note", 2000);
  if (!note) return { ok: false, message: "Görüşme notunu yazın." };
  const interest = oneOf(INTERESTS, formData.get("interest"));
  const nextStep = text(formData, "next_step", 200);
  const followUpAt = istanbulDate(formData.get("follow_up_at"));

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("sales_visits").insert({
    lead_id: leadId,
    channel: oneOf(CHANNELS, formData.get("channel")) ?? "yuz_yuze",
    interest,
    note,
    next_step: nextStep,
    created_by: user.id,
  });
  if (error) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };

  const { data: lead } = await admin.from("sales_leads").select("stage").eq("id", leadId).maybeSingle();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (interest) update.interest = interest;
  if (lead?.stage === "yeni") update.stage = "gorusuldu";
  // Yeni bir takip tarihi verildiyse hatırlatma onunla değişir; verilmediyse
  // eski hatırlatma bu görüşmeyle tamamlanmış sayılır.
  update.next_action_at = followUpAt;
  update.next_action = followUpAt ? nextStep : null;
  await admin.from("sales_leads").update(update).eq("id", leadId);

  refresh(leadId);
  return { ok: true, message: followUpAt ? "Görüşme ve takip tarihi kaydedildi." : "Görüşme kaydedildi." };
}

export async function deleteVisit(formData: FormData) {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  const leadId = Number(formData.get("lead_id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await createSupabaseAdminClient().from("sales_visits").delete().eq("id", id);
  refresh(leadId);
}

export async function completeFollowUp(formData: FormData) {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await createSupabaseAdminClient()
    .from("sales_leads")
    .update({ next_action_at: null, next_action: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh(id);
}

export async function setFollowUp(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  const at = istanbulDate(formData.get("follow_up_at"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Kayıt bulunamadı." };
  if (!at) return { ok: false, message: "Tarih ve saat seçin." };
  const { error } = await createSupabaseAdminClient()
    .from("sales_leads")
    .update({ next_action_at: at, next_action: text(formData, "next_step", 200), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };
  refresh(id);
  return { ok: true, message: "Takip tarihi kaydedildi." };
}

/* ---------------- Teklif ---------------- */

export async function updateOffer(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  const { user } = await requireSystemAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Kayıt bulunamadı." };
  const plan = oneOf(OFFER_PLANS, formData.get("offer_plan"));
  const rawPrice = String(formData.get("offer_price") ?? "").replace(",", ".").trim();
  const price = rawPrice ? Number(rawPrice) : null;
  if (price != null && (!Number.isFinite(price) || price < 0 || price > 1_000_000)) {
    return { ok: false, message: "Fiyatı sayı olarak yazın." };
  }

  const admin = createSupabaseAdminClient();
  const { data: lead } = await admin.from("sales_leads").select("stage").eq("id", id).maybeSingle();
  const update: Record<string, unknown> = {
    offer_plan: plan,
    offer_price: price,
    offer_note: longText(formData, "offer_note", 500),
    updated_at: new Date().toISOString(),
  };
  // Teklif yazılınca aday henüz o aşamaya gelmediyse "Teklif verildi"ye geçer.
  const advance = plan && ["yeni", "gorusuldu", "ilgileniyor"].includes(String(lead?.stage));
  if (advance) update.stage = "teklif";

  const { error } = await admin.from("sales_leads").update(update).eq("id", id);
  if (error) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };
  if (advance) await addSystemVisit(id, `Teklif: ${labelOf(OFFER_PLANS, plan)}${price != null ? ` · ${price} ₺` : ""}`, user.id);

  refresh(id);
  return { ok: true, message: advance ? "Teklif kaydedildi; aşama “Teklif verildi” oldu." : "Teklif kaydedildi." };
}

/* ---------------- Konum ---------------- */

export async function saveLocation(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Kayıt bulunamadı." };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { ok: false, message: "Konum alınamadı." };
  }
  const { error } = await createSupabaseAdminClient()
    .from("sales_leads")
    .update({ latitude, longitude, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };
  refresh(id);
  return { ok: true, message: "Konum kaydedildi." };
}

/* ---------------- Fotoğraflar ---------------- */

export async function uploadPhoto(_prev: SalesResult, formData: FormData): Promise<SalesResult> {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  const file = formData.get("photo");
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Kayıt bulunamadı." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Fotoğraf seçin." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "Yalnızca fotoğraf yüklenebilir." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Fotoğraf en fazla 5 MB olabilir." };

  const admin = createSupabaseAdminClient();
  const { data: lead, error: readError } = await admin.from("sales_leads").select("photos").eq("id", id).maybeSingle();
  if (readError || !lead) return { ok: false, message: `Kayıt bulunamadı: ${errorMessage(readError)}` };
  const photos = (lead.photos ?? []) as string[];
  if (photos.length >= 12) return { ok: false, message: "Bir işletmeye en fazla 12 fotoğraf eklenebilir." };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, message: `Fotoğraf yüklenemedi: ${uploadError.message}` };

  const { error } = await admin
    .from("sales_leads")
    .update({ photos: [...photos, path], updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    await admin.storage.from(PHOTO_BUCKET).remove([path]);
    return { ok: false, message: `Kaydedilemedi: ${errorMessage(error)}` };
  }

  refresh(id);
  return { ok: true, message: "Fotoğraf eklendi." };
}

export async function deletePhoto(formData: FormData) {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  const path = String(formData.get("path") ?? "");
  if (!Number.isInteger(id) || id <= 0 || !path.startsWith(`${id}/`)) return;

  const admin = createSupabaseAdminClient();
  const { data: lead } = await admin.from("sales_leads").select("photos").eq("id", id).maybeSingle();
  const photos = ((lead?.photos ?? []) as string[]).filter((item) => item !== path);
  await admin.from("sales_leads").update({ photos }).eq("id", id);
  await admin.storage.from(PHOTO_BUCKET).remove([path]);
  refresh(id);
}

/* ---------------- Restorana dönüştürme ---------------- */

// Yeni restoran formu kaydedince çağrılır: aday kazanıldı olur ve restorana bağlanır.
export async function linkLeadToRestaurant(leadId: number, restaurantId: number) {
  const { user } = await requireSystemAdmin();
  if (!Number.isInteger(leadId) || leadId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("sales_leads")
    .update({
      restaurant_id: restaurantId,
      stage: "kazanildi",
      lost_reason: null,
      next_action_at: null,
      next_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (!error) await addSystemVisit(leadId, "Kazanıldı: restoran hesabı açıldı.", user.id);
  refresh(leadId);
}
