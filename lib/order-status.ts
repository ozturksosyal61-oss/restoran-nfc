// Müşteri ekranlarındaki sipariş durum adları: TEK KAYNAK.
// Takip, hesap ve ana sayfadaki sipariş kartı bu listeyi kullanır.

export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "delivered" | "cancelled";

export const ORDER_STATUS: Record<OrderStatus, { label: string; detail: string; text: string }> = {
  pending: {
    label: "Onay bekliyor",
    detail: "İşletmeye iletildi",
    text: "Siparişiniz işletmeye iletildi, onay bekleniyor.",
  },
  accepted: {
    label: "Onaylandı",
    detail: "İşletme siparişi kabul etti",
    text: "İşletme siparişinizi kabul etti, birazdan hazırlanmaya başlayacak.",
  },
  preparing: {
    label: "Hazırlanıyor",
    detail: "Mutfakta",
    text: "Siparişiniz mutfakta, hazır olunca masanıza gelecek.",
  },
  ready: {
    label: "Hazır",
    detail: "Masanıza getiriliyor",
    text: "Siparişiniz hazır, masanıza getiriliyor.",
  },
  delivered: {
    label: "Teslim edildi",
    detail: "Afiyet olsun",
    text: "Siparişiniz teslim edildi. Afiyet olsun!",
  },
  cancelled: {
    label: "İptal edildi",
    detail: "İşletme siparişi iptal etti",
    text: "Bu sipariş işletme tarafından iptal edildi. Sorunuz varsa garsonunuza danışın.",
  },
};

// İlerleme sırası (iptal hariç).
export const ORDER_FLOW: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "delivered"];

export function orderStatusLabel(status: string | null | undefined) {
  return ORDER_STATUS[(status ?? "") as OrderStatus]?.label ?? "Sipariş";
}
