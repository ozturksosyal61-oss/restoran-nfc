// Claude (Anthropic) ile konuşan küçük yardımcı. Yalnızca sunucu kodunda
// kullanılır; anahtar ANTHROPIC_API_KEY ortam değişkenindedir.
//
// Yanıtı serbest metin yerine bir "araç çağrısı" olarak isteriz; böylece
// model her zaman verdiğimiz JSON şemasına uygun veri döndürür.

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const AI_NOT_CONFIGURED_MESSAGE =
  "Yapay zekâ özelliği şu an kullanılamıyor. Lütfen OZT Digital ile iletişime geçin.";

export type AiContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export class AiError extends Error {}

export async function callClaudeTool<T>({
  system,
  content,
  toolName,
  toolDescription,
  inputSchema,
  maxTokens = 8000,
}: {
  system: string;
  content: AiContent[];
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError(AI_NOT_CONFIGURED_MESSAGE);

  let response: Response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
        tool_choice: { type: "tool", name: toolName },
        messages: [{ role: "user", content }],
      }),
    });
  } catch (error) {
    console.error("Yapay zekâ bağlantı hatası:", error);
    throw new AiError("Yapay zekâ servisine ulaşılamadı. Biraz sonra tekrar deneyin.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Yapay zekâ hatası:", response.status, detail.slice(0, 500));

    if (response.status === 429 || response.status === 529) {
      throw new AiError("Yapay zekâ servisi şu an yoğun. Bir dakika sonra tekrar deneyin.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new AiError(AI_NOT_CONFIGURED_MESSAGE);
    }
    throw new AiError("Yapay zekâ isteği tamamlanamadı. Tekrar deneyin.");
  }

  const data = (await response.json()) as {
    content?: { type: string; name?: string; input?: unknown }[];
    stop_reason?: string;
  };

  if (data.stop_reason === "max_tokens") {
    throw new AiError("Yanıt çok uzun oldu. Daha az sayfa ya da ürünle tekrar deneyin.");
  }

  const toolUse = data.content?.find((block) => block.type === "tool_use" && block.name === toolName);
  if (!toolUse?.input) {
    throw new AiError("Yapay zekâ beklenen biçimde yanıt vermedi. Tekrar deneyin.");
  }

  return toolUse.input as T;
}
