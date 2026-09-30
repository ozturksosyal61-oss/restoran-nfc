-- OZT DIGITAL MENU
-- Ürün kalori bilgisi
--
-- calories: porsiyon başına yaklaşık kalori (kcal). Boşsa menüde gösterilmez.
-- calories_source: 'ai' (yapay zekâ tahmini) ya da 'manual' (işletme girdi).
--
-- Kod bu dosya çalışmadan da açılır (kalori gösterilmez, kalori sayfası
-- "güncelleme bekleniyor" der).

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS calories integer;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS calories_source text;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_calories_check;

ALTER TABLE public.products
ADD CONSTRAINT products_calories_check
CHECK (calories IS NULL OR calories BETWEEN 0 AND 5000);

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_calories_source_check;

ALTER TABLE public.products
ADD CONSTRAINT products_calories_source_check
CHECK (calories_source IS NULL OR calories_source IN ('ai', 'manual'));
