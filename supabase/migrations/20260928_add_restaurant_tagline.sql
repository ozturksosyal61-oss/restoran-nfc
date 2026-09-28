-- OZT DIGITAL MENU
-- Restoran kısa sloganı (örn. "Restaurant & Cafe")
-- İşletme ayarlarından girilir, restoran ana sayfasında adın altında görünür.
-- Kod bu sütun yokken de çalışır; sütun eklenene kadar slogan gösterilmez.

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS tagline text;
