-- OZT DIGITAL MENU
-- Canlı masa haritası (yönetici "Salon" sayfası ve garson ekranı)
--
-- Masanın şekli, kişi sayısı, salondaki konumu ve bölümü. Konumu
-- girilmemiş masalar haritada otomatik ızgaraya dizilir; restoran hiçbir
-- şey ayarlamadan da haritayı kullanabilir.
--
-- pos_x / pos_y: masanın merkezi, salon alanının yüzdesi (0–100).

ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'kare',
  ADD COLUMN IF NOT EXISTS seats smallint NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS pos_x real,
  ADD COLUMN IF NOT EXISTS pos_y real,
  ADD COLUMN IF NOT EXISTS zone text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_tables_floor_valid') THEN
    ALTER TABLE public.restaurant_tables
      ADD CONSTRAINT restaurant_tables_floor_valid CHECK (
        shape IN ('kare', 'yuvarlak', 'uzun')
        AND seats BETWEEN 1 AND 20
        AND (pos_x IS NULL OR pos_x BETWEEN 0 AND 100)
        AND (pos_y IS NULL OR pos_y BETWEEN 0 AND 100)
        AND (zone IS NULL OR char_length(zone) BETWEEN 1 AND 40)
      );
  END IF;
END;
$$;
