import { AiError, callAiTool, type AiContent } from "./ai";

// Menü fotoğrafından / PDF'inden kategori ve ürün çıkarma (yapay zekâ).
// İşletme panelindeki "Fotoğraftan aktar" ve sistem panelindeki müşteriye
// özel demo oluşturucu ortak kullanır. Yalnızca sunucuda.

export type DraftProduct = {
  name: string;
  description: string;
  price: number | null;
  ingredients: string;
  allergens: string;
};

export type DraftCategory = {
  name: string;
  products: DraftProduct[];
};

export type AnalyzeResult =
  | { ok: true; categories: DraftCategory[] }
  | { ok: false; message: string };

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_FILES = 8;
export const MAX_TOTAL_BYTES = 5.5 * 1024 * 1024;
export const MAX_PRODUCTS = 400;

export function clean(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanPrice(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) return null;
  return Math.round(number * 100) / 100;
}

export async function extractMenu(files: File[]): Promise<AnalyzeResult> {

  if (files.length === 0) return { ok: false, message: "Menünüzün fotoğrafını ya da PDF dosyasını seçin." };
  if (files.length > MAX_FILES) return { ok: false, message: `En fazla ${MAX_FILES} dosya yükleyebilirsiniz.` };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_BYTES) {
    return { ok: false, message: "Dosyalar toplamda çok büyük (en fazla 5 MB). Daha az sayfa seçin." };
  }

  const content: AiContent[] = [];

  for (const file of files) {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");

    if (file.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else if (IMAGE_TYPES.includes(file.type)) {
      content.push({ type: "image", source: { type: "base64", media_type: file.type, data } });
    } else {
      return { ok: false, message: `"${file.name}" desteklenmiyor. JPG, PNG, WEBP ya da PDF yükleyin.` };
    }
  }

  content.push({
    type: "text",
    text:
      "Bu dosyalar bir restoranın menüsü. Menüdeki tüm kategorileri ve ürünleri, menüdeki sırasıyla çıkar.",
  });

  try {
    const result = await callAiTool<{ categories: DraftCategory[] }>({
      system:
        "Sen Türk restoran menülerini dijitale aktaran bir asistansın. Görsellerdeki ya da PDF'teki menüyü " +
        "olduğu gibi aktar; bilgi uydurma. Metni Türkçe bırak, yalnızca bariz yazım/okuma hatalarını düzelt. " +
        "Fiyatlar Türk lirasıdır; price alanına yalnızca sayı yaz (örn. 185 ya da 92.5). Fiyat okunamıyorsa price'ı boş bırak. " +
        "Bir ürünün birden fazla boyutu/fiyatı varsa her birini ayrı ürün yap: 'Çay (Küçük)', 'Çay (Büyük)'. " +
        "description yalnızca menüde yazan açıklamadır; yoksa boş bırak. ingredients ve allergens yalnızca menüde " +
        "açıkça yazıyorsa, virgülle ayrılmış liste olarak doldur. Kategori başlığı yoksa ürünleri anlamlı " +
        "kategorilere (Yemekler, İçecekler, Tatlılar gibi) grupla.",
      content,
      toolName: "save_menu",
      toolDescription: "Menüden çıkarılan kategorileri ve ürünleri kaydet.",
      inputSchema: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      price: { type: ["number", "null"] },
                      ingredients: { type: "string" },
                      allergens: { type: "string" },
                    },
                    required: ["name"],
                  },
                },
              },
              required: ["name", "products"],
            },
          },
        },
        required: ["categories"],
      },
      maxTokens: 16000,
    });

    const categories = (Array.isArray(result.categories) ? result.categories : [])
      .map((category) => ({
        name: clean(category?.name, 60) || "Diğer",
        products: (Array.isArray(category?.products) ? category.products : [])
          .map((product) => ({
            name: clean(product?.name, 120),
            description: clean(product?.description, 500),
            price: cleanPrice(product?.price),
            ingredients: clean(product?.ingredients, 500),
            allergens: clean(product?.allergens, 300),
          }))
          .filter((product) => product.name),
      }))
      .filter((category) => category.products.length > 0);

    if (categories.length === 0) {
      return {
        ok: false,
        message: "Menüde ürün bulunamadı. Fotoğrafın net ve menünün tamamen görünür olduğundan emin olun.",
      };
    }

    return { ok: true, categories };
  } catch (error) {
    console.error("MENÜ OKUMA HATASI:", error);
    return {
      ok: false,
      message: error instanceof AiError ? error.message : "Menü okunamadı. Tekrar deneyin.",
    };
  }
}
