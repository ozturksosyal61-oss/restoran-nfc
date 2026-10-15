-- OZT DIGITAL MENU
-- Paket fiyatları ve adları (site ile abonelik sayfası aynı fiyatı göstersin)
--
--   Başlangıç  249 ₺/ay   (yıllık 2.490 ₺)
--   Pro        799 ₺/ay   (yıllık 7.990 ₺)
--   Premium  1.499 ₺/ay   (yıllık 14.990 ₺)
--
-- Yıllık fiyat önceki gibi aylığın 10 katı (2 ay hediye).
-- Paket özellikleri artık koddaki tek listeden (lib/plan.ts) gösterilir;
-- buradaki "features" metinleri de aynı içerikle güncellenir.

UPDATE public.subscription_plans
SET monthly_price = 249, yearly_price = 2490, updated_at = now(),
    features = '["QR dijital menü, ürün ve kategori yönetimi", "Menü açılış duyurusu", "Geri bildirim ve Google yorum yönlendirmesi", "Menü istatistikleri", "Kampanyalar", "Ürün etiketleri"]'::jsonb
WHERE slug = 'baslangic';

UPDATE public.subscription_plans
SET name = 'Pro', monthly_price = 799, yearly_price = 7990, updated_at = now(),
    features = '["Başlangıç''taki her şey", "Masaya özel QR ve NFC", "Masadan sipariş ve sipariş takibi", "Garson çağırma ve hesap isteme", "Satış raporları", "Çok dilli menü", "Masa oyunları"]'::jsonb
WHERE slug = 'profesyonel';

UPDATE public.subscription_plans
SET monthly_price = 1499, yearly_price = 14990, updated_at = now(),
    features = '["Pro''daki her şey", "Masadan kartla ödeme, hesap bölüşme, bahşiş", "Çalışanlar, garson ve mutfak ekranları", "Excel rapor ve ürün satış analizi", "Kalori bilgileri", "Yapay zekâ özellikleri"]'::jsonb
WHERE slug = 'premium';
