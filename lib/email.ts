// E-posta gönderimi (Resend). Yalnızca sunucu kodunda.
//
// Ortam değişkenleri:
//   RESEND_API_KEY  Resend API anahtarı (yoksa e-posta gönderilmez)
//   EMAIL_FROM      Gönderen, örn. "OZT Digital <rapor@bildirim.oztdigital.com.tr>"
//                   (alan adı Resend'de doğrulanmış olmalı)

const API_URL = "https://api.resend.com";
const DEFAULT_FROM = "OZT Digital <rapor@bildirim.oztdigital.com.tr>";
// Resend toplu gönderimde tek istekte en fazla 100 e-posta kabul eder.
const BATCH_LIMIT = 100;

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  // "Aboneliği bırak" bağlantısı (e-posta istemcilerindeki çıkış düğmesi).
  unsubscribeUrl?: string;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function payload(message: EmailMessage) {
  return {
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.unsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  };
}

async function post(path: string, body: unknown) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "RESEND_API_KEY tanımlı değil." };

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false as const, error: `Resend ${response.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendEmail(message: EmailMessage) {
  return post("/emails", payload(message));
}

// Çok sayıda e-posta: 100'erli gruplar hâlinde (hız sınırına takılmaz).
// sent[i]: messages[i] gönderildi mi (grup başarısızsa gruptakilerin hepsi false).
export async function sendEmails(messages: EmailMessage[]) {
  const sent = messages.map(() => false);
  const errors: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
    const chunk = messages.slice(i, i + BATCH_LIMIT);
    const result = await post("/emails/batch", chunk.map(payload));
    if (result.ok) chunk.forEach((_, index) => (sent[i + index] = true));
    else errors.push(result.error);
  }
  return { sent, errors };
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// E-posta HTML'ine giren her metin bundan geçer.
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}
