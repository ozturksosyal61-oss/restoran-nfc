-- OZT DIGITAL MENU
-- Restoran bağlantıları yalnızca http(s) olabilir
--
-- Instagram, Google yorum, logo ve kapak adresleri müşteri sayfasında
-- bağlantı / görsel olarak kullanılır. "javascript:" gibi adresler
-- yazılırsa müşterinin (ya da oturumu açık bir yöneticinin) tarayıcısında
-- kod çalıştırılabilir. Kayıt hangi yoldan gelirse gelsin engellenir.
-- Mevcut kayıtların hepsi uygundur (2026-10-13 kontrol edildi).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_links_http') THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_links_http CHECK (
        (instagram_url IS NULL OR instagram_url ~* '^https?://')
        AND (google_review_url IS NULL OR google_review_url ~* '^https?://')
        AND (logo_url IS NULL OR logo_url ~* '^https?://')
        AND (cover_image_url IS NULL OR cover_image_url ~* '^https?://')
      ) NOT VALID;
  END IF;
END;
$$;
