-- OZT DIGITAL MENU
-- Masa oyunları ayarı
--
-- Oyunlar tamamen müşterinin telefonunda çalışır; oyun verisi (puan, tur,
-- takım adları) veritabanına YAZILMAZ. Burada yalnızca restoranın ayarı
-- tutulur: oyunlar açık mı, hangi oyunlar görünsün.
-- Varsayılan KAPALI: mevcut ve yeni restoranlarda işletme kendisi açar.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS table_games jsonb NOT NULL
  DEFAULT '{"enabled": false, "games": ["anlat", "refleks"]}'::jsonb;
