import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Restoranların ödeme API anahtarlarını veritabanında şifreli tutar.
// Yalnızca sunucu kodunda kullanılır.
//
// Anahtar PAYMENT_ENCRYPTION_KEY ortam değişkenidir (en az 32 karakter).
// Değiştirilirse kayıtlı anahtarlar çözülemez; restoranların bilgileri
// yeniden girmesi gerekir.

const VERSION = "v1";

export const ENCRYPTION_KEY_MISSING_MESSAGE =
  "Online ödeme için sunucu ayarı eksik (PAYMENT_ENCRYPTION_KEY). Lütfen OZT Digital ile iletişime geçin.";

export function encryptionConfigured() {
  return (process.env.PAYMENT_ENCRYPTION_KEY ?? "").length >= 32;
}

function key() {
  const secret = process.env.PAYMENT_ENCRYPTION_KEY ?? "";
  if (secret.length < 32) throw new Error(ENCRYPTION_KEY_MISSING_MESSAGE);
  return createHash("sha256").update(secret).digest();
}

// Şifreli metin restorana bağlanır (AAD): bir restoranın kaydı başka
// restoranın satırına kopyalanırsa çözülemez.
export function encryptCredentials(value: object, restaurantId: number) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`restaurant:${restaurantId}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function decryptCredentials<T>(payload: string, restaurantId: number): T {
  const [version, body] = payload.split(":");
  if (version !== VERSION || !body) throw new Error("Kayıtlı ödeme bilgisi okunamadı.");

  const raw = Buffer.from(body, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAAD(Buffer.from(`restaurant:${restaurantId}`));
  decipher.setAuthTag(raw.subarray(12, 28));
  const decrypted = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

// Ekranda gösterilecek kısa ipucu: "•••• 1a2b".
export function maskSecret(value: string) {
  return value.length <= 4 ? "••••" : `•••• ${value.slice(-4)}`;
}
