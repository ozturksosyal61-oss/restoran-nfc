-- OZT DIGITAL MENU
-- Restoran WiFi bilgileri
-- İşletme ayarlarından girilir, restoran sayfasındaki "Bilgi" penceresinde
-- müşteriye gösterilir. Her restoranın kendi satırında tutulur.

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS wifi_name text,
ADD COLUMN IF NOT EXISTS wifi_password text;
