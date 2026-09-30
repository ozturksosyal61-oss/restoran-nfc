// Müşteriye ve panele gösterilen sipariş numarası: her iş günü 1'den
// başlayan günlük numara. Veritabanı güncellemesi yapılmamışsa eski
// sipariş kimliği gösterilir.
export function orderNumber(order: { id: number | string; daily_number?: number | null }) {
  return `#${order.daily_number ?? order.id}`;
}
