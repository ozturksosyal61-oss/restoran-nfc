// İletişim formu: konu seçenekleri ve durum etiketleri (site ve sistem paneli ortak).

export const CONTACT_TOPICS = [
  { value: "demo", label: "Demo ve tanıtım istiyorum" },
  { value: "paket", label: "Paketler ve fiyatlar" },
  { value: "urun", label: "NFC stand / QR ürünleri" },
  { value: "destek", label: "Mevcut müşteriyim, destek" },
  { value: "genel", label: "Diğer" },
] as const;

export const CONTACT_STATUSES = [
  { value: "yeni", label: "Yeni", tone: "s-pending" },
  { value: "arandi", label: "Dönüş yapıldı", tone: "s-accepted" },
  { value: "kapandi", label: "Kapandı", tone: "s-delivered" },
] as const;

export type ContactRequest = {
  id: number;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  topic: string;
  message: string | null;
  status: string;
  admin_note: string | null;
  lead_id: number | null;
  source: string | null;
  created_at: string;
};
