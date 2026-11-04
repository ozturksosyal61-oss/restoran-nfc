"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { APP_BUCKET, APP_STATUSES, isHexColor, isHttpUrl, type AppStatus } from "../../../lib/apps";

// Uygulamalar vitrini yönetimi. Her işlem önce sistem yöneticisi kontrolünden geçer.

export type AppResult = { ok: boolean; message: string };

export type AppInput = {
  id: string | null;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon_path: string | null;
  screenshots: string[];
  status: AppStatus;
  app_store_url: string;
  play_store_url: string;
  accent_color: string;
  privacy_url: string;
  support_url: string;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function refresh() {
  revalidatePath("/uygulamalar");
  revalidatePath("/sistem/uygulamalar");
}

export async function uploadAppImage(formData: FormData): Promise<AppResult & { path?: string }> {
  await requireSystemAdmin();
  const slug = String(formData.get("slug") ?? "");
  const kind = formData.get("kind") === "icon" ? "icon" : "screen";
  const file = formData.get("file");
  if (!SLUG.test(slug)) return { ok: false, message: "Önce geçerli bir slug girin." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Dosya seçin." };
  if (file.type !== "image/webp") return { ok: false, message: "Görsel WebP olmalı." };
  if (file.size > 4 * 1024 * 1024) return { ok: false, message: "Görsel en fazla 4 MB olabilir." };

  const path = `${slug}/${kind}-${randomUUID()}.webp`;
  const { error } = await createSupabaseAdminClient()
    .storage.from(APP_BUCKET)
    .upload(path, file, { contentType: "image/webp", upsert: false });
  if (error) return { ok: false, message: `Yüklenemedi: ${error.message}` };
  return { ok: true, message: "Yüklendi.", path };
}

export async function saveApp(input: AppInput): Promise<AppResult> {
  await requireSystemAdmin();
  const slug = input.slug.trim();
  const name = input.name.trim();
  if (!SLUG.test(slug)) return { ok: false, message: "Slug yalnızca küçük harf, rakam ve tire içerebilir." };
  if (!name) return { ok: false, message: "Ad zorunlu." };
  if (!APP_STATUSES.some((item) => item.value === input.status)) return { ok: false, message: "Geçersiz durum." };
  if (!isHexColor(input.accent_color)) return { ok: false, message: "Renk #rrggbb biçiminde olmalı." };

  const urls: Record<string, string | null> = {};
  for (const key of ["app_store_url", "play_store_url", "privacy_url", "support_url"] as const) {
    const value = input[key].trim();
    if (value && !isHttpUrl(value)) return { ok: false, message: `Geçersiz bağlantı: ${value}` };
    urls[key] = value || null;
  }

  const admin = createSupabaseAdminClient();
  const row = {
    slug,
    name: name.slice(0, 80),
    tagline: input.tagline.trim().slice(0, 120),
    description: input.description.trim().slice(0, 600),
    icon_path: input.icon_path,
    screenshots: input.screenshots.filter(Boolean).slice(0, 8),
    status: input.status,
    accent_color: input.accent_color.toLowerCase(),
    ...urls,
    updated_at: new Date().toISOString(),
  };

  let removed: string[] = [];
  if (input.id) {
    const { data: old } = await admin.from("apps").select("icon_path, screenshots").eq("id", input.id).maybeSingle();
    if (old) {
      const keep = new Set([row.icon_path, ...row.screenshots]);
      removed = [old.icon_path, ...(old.screenshots ?? [])].filter((path): path is string => !!path && !keep.has(path));
    }
    const { error } = await admin.from("apps").update(row).eq("id", input.id);
    if (error) return { ok: false, message: error.code === "23505" ? "Bu slug başka bir uygulamada kullanılıyor." : error.message };
  } else {
    const { data: last } = await admin.from("apps").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    const { error } = await admin.from("apps").insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
    if (error) return { ok: false, message: error.code === "23505" ? "Bu slug başka bir uygulamada kullanılıyor." : error.message };
  }

  if (removed.length) await admin.storage.from(APP_BUCKET).remove(removed);
  refresh();
  return { ok: true, message: "Kaydedildi." };
}

export async function deleteApp(formData: FormData) {
  await requireSystemAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("apps").select("icon_path, screenshots").eq("id", id).maybeSingle();
  await admin.from("apps").delete().eq("id", id);
  const files = [data?.icon_path, ...(data?.screenshots ?? [])].filter((path): path is string => !!path);
  if (files.length) await admin.storage.from(APP_BUCKET).remove(files);
  refresh();
}

// Sıra değişimi: komşu kayıtla sort_order değiş tokuşu.
export async function moveApp(formData: FormData) {
  await requireSystemAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("apps").select("id, sort_order").order("sort_order").order("created_at");
  const list = data ?? [];
  const index = list.findIndex((item) => item.id === id);
  const other = list[index + direction];
  if (index < 0 || !other) return;
  // Eşit sıra değerleri olsa bile tutarlı olsun diye listeyi yeniden numaralandır.
  const order = list.map((item) => item.id);
  [order[index], order[index + direction]] = [order[index + direction], order[index]];
  await Promise.all(order.map((itemId, position) => admin.from("apps").update({ sort_order: position + 1 }).eq("id", itemId)));
  refresh();
}
