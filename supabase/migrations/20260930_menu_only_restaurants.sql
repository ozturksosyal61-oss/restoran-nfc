-- OZT DIGITAL MENU
-- "Sadece menü" restoranları
--
-- Bu restoranlarda müşteri yalnızca menüyü görür: sipariş, garson çağırma,
-- hesap / ödeme ve çalışan değerlendirme yoktur. Tek bir QR kod menüye açılır;
-- masa kodu kullanılmaz.
--
-- Uygulama kodu bu sütun yokken de çalışır (tüm restoranlar tam sürüm sayılır),
-- bu yüzden dosya kod yayına alınmadan önce ya da sonra çalıştırılabilir.
-- "Sadece menü" restoranı oluşturmadan önce çalıştırılmış olmalıdır.

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS menu_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.restaurants.menu_only IS
  'true: sadece menü restoranı (sipariş, garson çağırma, ödeme yok).';

-- ---------------------------------------------------------------
-- 1) Restoran türünü yalnızca sistem yöneticisi veya sunucu
--    (service role) değiştirebilir.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_restaurant_menu_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.menu_only IS NOT DISTINCT FROM OLD.menu_only THEN
    RETURN NEW;
  END IF;

  -- Service role ve SQL Editor oturumsuz çalışır (auth.uid() boş).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Restoran türünü yalnızca sistem yöneticisi değiştirebilir.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS protect_restaurant_menu_only ON public.restaurants;

CREATE TRIGGER protect_restaurant_menu_only
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.protect_restaurant_menu_only();

-- ---------------------------------------------------------------
-- 2) Sadece menü restoranlarına sipariş, garson / hesap talebi ve
--    masa eklenemez. Ekran gizlense bile veritabanı da reddeder.
--    Sistem yöneticisi ve service role bu kuraldan muaftır.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_menu_only_restaurant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = NEW.restaurant_id AND menu_only
  ) THEN
    RETURN NEW;
  END IF;

  -- Masa ekleme: sistem yöneticisi ve service role yapabilir.
  -- Sipariş ve talepler müşteri fonksiyonlarından gelir; onlar her zaman
  -- reddedilir.
  IF TG_TABLE_NAME = 'restaurant_tables'
     AND (
       auth.uid() IS NULL
       OR EXISTS (SELECT 1 FROM public.system_admins WHERE user_id = auth.uid())
     ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Bu işletme yalnızca dijital menü kullanıyor; sipariş ve masa talebi alınmıyor.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS reject_menu_only_orders ON public.orders;
CREATE TRIGGER reject_menu_only_orders
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.reject_menu_only_restaurant();

DROP TRIGGER IF EXISTS reject_menu_only_service_requests ON public.service_requests;
CREATE TRIGGER reject_menu_only_service_requests
BEFORE INSERT ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.reject_menu_only_restaurant();

DROP TRIGGER IF EXISTS reject_menu_only_tables ON public.restaurant_tables;
CREATE TRIGGER reject_menu_only_tables
BEFORE INSERT ON public.restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION public.reject_menu_only_restaurant();
