// Desteklenen ödeme sağlayıcıları ve panelde istenen alanlar.
// Bu dosya hem sunucuda hem tarayıcıda kullanılır; gizli bilgi içermez.

export type PaymentProvider = "iyzico" | "paytr";
export type PaymentMode = "test" | "live";

export type IyzicoCredentials = { apiKey: string; secretKey: string };
export type PaytrCredentials = { merchantId: string; merchantKey: string; merchantSalt: string };

export type ProviderField = {
  name: string;
  label: string;
  // Gizli alanlar kaydedildikten sonra ekrana bir daha gelmez.
  secret: boolean;
  placeholder?: string;
};

export type ProviderInfo = {
  id: PaymentProvider;
  name: string;
  summary: string;
  fields: ProviderField[];
  whereToFind: string;
  testHelp: string;
  testCard: { number: string; expiry: string; cvc: string };
};

export const PROVIDERS: Record<PaymentProvider, ProviderInfo> = {
  iyzico: {
    id: "iyzico",
    name: "iyzico",
    summary: "iyzico üye işyeri hesabınızın API anahtarlarıyla çalışır.",
    fields: [
      { name: "apiKey", label: "API anahtarı", secret: true, placeholder: "sandbox-… ya da canlı anahtar" },
      { name: "secretKey", label: "Güvenlik anahtarı (Secret key)", secret: true },
    ],
    whereToFind:
      "iyzico üye işyeri panelinde Ayarlar → Firma Ayarları bölümündedir. Test anahtarları için sandbox-merchant.iyzipay.com adresinden ücretsiz test hesabı açabilirsiniz; test anahtarları “sandbox-” ile başlar.",
    testHelp: "Test modunda iyzico'nun test kartı kullanılır, gerçek para çekilmez.",
    testCard: { number: "5528 7900 0000 0008", expiry: "12/30", cvc: "123" },
  },
  paytr: {
    id: "paytr",
    name: "PayTR",
    summary: "PayTR mağaza hesabınızın entegrasyon bilgileriyle çalışır.",
    fields: [
      { name: "merchantId", label: "Mağaza no (merchant_id)", secret: false, placeholder: "123456" },
      { name: "merchantKey", label: "Mağaza parola (merchant_key)", secret: true },
      { name: "merchantSalt", label: "Mağaza gizli anahtar (merchant_salt)", secret: true },
    ],
    whereToFind:
      "PayTR mağaza panelinde Destek & Kurulum → Entegrasyon Bilgileri sayfasındadır. Aynı sayfada “Bildirim URL” alanına aşağıdaki adresi kaydetmeniz gerekir.",
    testHelp: "Test modunda PayTR'nin test kartı kullanılır, gerçek para çekilmez.",
    testCard: { number: "4355 0843 5508 4358", expiry: "12/30", cvc: "000" },
  },
};

export function isProvider(value: unknown): value is PaymentProvider {
  return value === "iyzico" || value === "paytr";
}

export function isMode(value: unknown): value is PaymentMode {
  return value === "test" || value === "live";
}

// Test ödemesinin tutarı (TL).
export const TEST_AMOUNT = 1;
