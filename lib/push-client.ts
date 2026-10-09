"use client";

// Tarayıcı tarafı: bu cihazı telefona bildirim için kaydeder (lib/push.ts).

export type PushState = "unsupported" | "ios-install" | "denied" | "on" | "off";

export const IOS_INSTALL_TEXT =
  "iPhone'da bildirim için: Safari'de Paylaş simgesine dokunun, “Ana Ekrana Ekle”yi seçin ve paneli ana ekrandaki simgeden açın.";
export const DENIED_TEXT =
  "Bildirim izni kapalı. Telefonun ya da tarayıcının ayarlarından bu site için bildirimlere izin verin.";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
// Kullanıcı bu cihazda bildirimi açtı mı. Çıkışta kayıt silinir ama tercih
// kalır; yeniden giriş yapınca bildirim kendiliğinden açılır.
const WANTED_KEY = "ozt_push_wanted";

function setWanted(value: boolean) {
  try {
    window.localStorage.setItem(WANTED_KEY, value ? "1" : "0");
  } catch {
    // yok sayılır
  }
}

function wanted() {
  try {
    return window.localStorage.getItem(WANTED_KEY) === "1";
  } catch {
    return false;
  }
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined" || !VAPID_KEY) return "unsupported";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  try {
    return (await currentSubscription()) ? "on" : "off";
  } catch {
    return "off";
  }
}

async function save(subscription: PushSubscription) {
  const response = await fetch("/api/bildirim/abone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
  return { ok: Boolean(result?.ok), message: result?.message ?? "Bildirim kaydı yapılamadı." };
}

// İzin ister, cihazı kaydeder. Daha önce açıldıysa kaydı tazeler.
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  const state = await getPushState();
  if (state === "unsupported") return { ok: false, message: "Bu tarayıcı telefona bildirimi desteklemiyor." };
  if (state === "ios-install") return { ok: false, message: IOS_INSTALL_TEXT };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, message: DENIED_TEXT };

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY) }));
    const saved = await save(subscription);
    if (saved.ok) setWanted(true);
    return saved.ok ? { ok: true, message: "Bildirimler açıldı. Telefon kilitliyken de haber verilecek." } : saved;
  } catch {
    return { ok: false, message: "Bildirim açılamadı. Sayfayı yenileyip tekrar deneyin." };
  }
}

// Bildirimi bu cihazda kapatır. Çıkış yaparken keepPreference ile çağrılır:
// kayıt silinir, yeniden girişte bildirim kendiliğinden açılır.
export async function disablePush({ keepPreference = false }: { keepPreference?: boolean } = {}) {
  if (!keepPreference) setWanted(false);
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await fetch("/api/bildirim/abone", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // yok sayılır
  }
}

// Panel açılınca: kayıt varsa tazeler (tarayıcı adresi değiştirmiş olabilir),
// çıkışta silinmiş ve kullanıcı bildirimi açık bırakmışsa yeniden açar.
export async function refreshPush() {
  const state = await getPushState();
  if (state === "off" && wanted() && Notification.permission === "granted") {
    await enablePush();
    return;
  }
  if (state !== "on") return;
  try {
    const subscription = await currentSubscription();
    if (subscription) await save(subscription);
  } catch {
    // yok sayılır
  }
}
