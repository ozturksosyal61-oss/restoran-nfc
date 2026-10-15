// Yasal metinlerin ortak bilgileri: TEK KAYNAK.
// Şirket bilgisi değişirse (vergi numarası, adres) yalnızca burası güncellenir.
// Metinlerde esaslı bir değişiklik yapılınca LEGAL_VERSION artırılır;
// işletmeler panele girişte yeni sürümü yeniden onaylar.

export const COMPANY = {
  brand: "OZT Digital",
  owner: "Turan Öztürk",
  // Şahıs işletmesi unvanı.
  legalName: "Ozt Digital - Turan Öztürk",
  taxInfo: "Ümraniye Vergi Dairesi · VKN 56230558944" as string | null,
  address: "Akdeniz Caddesi No: 33, Ümraniye / İstanbul",
  // Telefon ve WhatsApp aynı numara.
  phone: "+90 506 909 00 61",
  phoneHref: "tel:+905069090061",
  // Yasal metinlerdeki başvuru adresi (sitede iletişim için gösterilmez).
  email: "hvturanozt@icloud.com",
  website: "oztdigital.com.tr",
};

export const LEGAL_VERSION = "2026-10-05";
export const LEGAL_UPDATED = "5 Ekim 2026";

// İşletmelerin panele ilk girişte onayladığı belgeler.
export const ACCEPTANCE_DOCUMENTS = [
  { key: "kullanim-sartlari", href: "/kullanim-sartlari", label: "Kullanım Şartları", after: "'nı okudum ve kabul ediyorum." },
  {
    key: "mesafeli-satis",
    href: "/mesafeli-satis-sozlesmesi",
    label: "Mesafeli Satış Sözleşmesi",
    after: " ile İptal ve İade Koşulları'nı okudum ve kabul ediyorum.",
  },
  { key: "veri-isleme", href: "/veri-isleme-sozlesmesi", label: "Veri İşleme Sözleşmesi", after: "'ni okudum ve kabul ediyorum." },
  { key: "kvkk", href: "/kvkk", label: "KVKK Aydınlatma Metni", after: "'ni okudum." },
] as const;

// Çerez tercihi tarayıcıda saklanır; sürüm değişirse yeniden sorulur.
export const COOKIE_CONSENT_KEY = "ozt_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_SETTINGS_EVENT = "ozt:cookie-settings";
