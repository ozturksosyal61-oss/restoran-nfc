// Yapay zekâ ile konuşan küçük yardımcı (menü çevirisi ve fotoğraftan menü
// okuma). Yalnızca sunucu kodunda kullanılır.
//
// İki sağlayıcı desteklenir; hangisinin anahtarı tanımlıysa o kullanılır
// (ikisi de varsa Gemini):
//   GEMINI_API_KEY     → Google Gemini   (model: GEMINI_MODEL)
//   ANTHROPIC_API_KEY  → Anthropic Claude (model: ANTHROPIC_MODEL)
//
// Yanıt her iki sağlayıcıda da verdiğimiz JSON şemasına uygun istenir.

const GEMINI_DEFAULT_MODEL = "gemini-flash-latest";
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5";

type Provider = "gemini" | "anthropic";

function provider(): Provider | null {
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return null;
}

export function aiConfigured() {
  return provider() !== null;
}

export const AI_NOT_CONFIGURED_MESSAGE =
  "Yapay zekâ özelliği şu an kullanılamıyor. Lütfen OZT Digital ile iletişime geçin.";

export type AiContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export class AiError extends Error {}

type AiRequest = {
  system: string;
  content: AiContent[];
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
};

export async function callAiTool<T>(request: AiRequest): Promise<T> {
  const selected = provider();
  if (!selected) throw new AiError(AI_NOT_CONFIGURED_MESSAGE);
  return selected === "gemini" ? callGemini<T>(request) : callAnthropic<T>(request);
}

async function send(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    console.error("Yapay zekâ bağlantı hatası:", error);
    throw new AiError("Yapay zekâ servisine ulaşılamadı. Biraz sonra tekrar deneyin.");
  }
}

/* ---------------- Google Gemini ---------------- */

// JSON şemasını Gemini'nin beklediği biçime çevirir
// (["number", "null"] → { type: "NUMBER", nullable: true }).
function toGeminiSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;
  const source = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === "type") {
      const types = Array.isArray(value) ? value : [value];
      const real = types.filter((type) => type !== "null");
      result.type = String(real[0] ?? "string").toUpperCase();
      if (real.length < types.length) result.nullable = true;
    } else if (key === "properties" && value && typeof value === "object") {
      result.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([name, child]) => [name, toGeminiSchema(child)])
      );
    } else if (key === "items") {
      result.items = toGeminiSchema(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function callGemini<T>({ system, content, toolDescription, inputSchema, maxTokens = 8000 }: AiRequest) {
  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;

  const parts = content.map((block) =>
    block.type === "text"
      ? { text: block.text }
      : { inline_data: { mime_type: block.source.media_type, data: block.source.data } }
  );

  const response = await send(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: `${system}\n\n${toolDescription}` }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(inputSchema),
          // Düşünen modellerde düşünme de bu sınıra dahildir; pay bırakılır.
          maxOutputTokens: Math.min(65536, maxTokens * 3),
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Gemini hatası:", response.status, detail.slice(0, 800));

    if (response.status === 429) {
      throw new AiError("Yapay zekâ kullanım sınırına ulaşıldı. Birkaç dakika sonra tekrar deneyin.");
    }
    if (response.status === 503 || response.status === 500) {
      throw new AiError("Yapay zekâ servisi şu an yoğun. Bir dakika sonra tekrar deneyin.");
    }
    if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(detail) || response.status === 403) {
      throw new AiError(AI_NOT_CONFIGURED_MESSAGE);
    }
    if (response.status === 404) {
      throw new AiError("Yapay zekâ modeli bulunamadı. Lütfen OZT Digital ile iletişime geçin.");
    }
    throw new AiError("Yapay zekâ isteği tamamlanamadı. Tekrar deneyin.");
  }

  const data = (await response.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    promptFeedback?: { blockReason?: string };
  };

  const candidate = data.candidates?.[0];

  if (data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") {
    throw new AiError("Yapay zekâ bu içeriği işlemedi. Farklı bir fotoğrafla tekrar deneyin.");
  }
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new AiError("Yanıt çok uzun oldu. Daha az sayfa ya da ürünle tekrar deneyin.");
  }

  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Gemini yanıtı JSON değil:", text.slice(0, 500));
    throw new AiError("Yapay zekâ beklenen biçimde yanıt vermedi. Tekrar deneyin.");
  }
}

/* ---------------- Anthropic Claude ---------------- */

async function callAnthropic<T>({
  system,
  content,
  toolName,
  toolDescription,
  inputSchema,
  maxTokens = 8000,
}: AiRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY!.trim();

  const response = await send("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Anthropic hatası:", response.status, detail.slice(0, 500));

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
