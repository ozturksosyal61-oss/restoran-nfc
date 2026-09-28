-- OZT DIGITAL MENU
-- Aurora renk temaları: zeytin, bordo, lacivert, mermer
-- + temayı yalnızca sistem yöneticisinin değiştirebilmesi (dosyanın sonu)
--
-- restaurants.theme sütunundaki eski izin listesi yeni temaları reddeder.
-- Bu dosya tema ile ilgili tüm CHECK kısıtlarını kaldırıp güncel listeyle
-- tek bir kısıt olarak yeniden ekler. Mevcut restoranların teması değişmez.
-- Liste lib/themes.ts içindeki RESTAURANT_THEMES ile aynı olmalıdır.

DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.restaurants'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%theme%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.restaurants DROP CONSTRAINT %I',
      v_constraint.conname
    );
  END LOOP;
END;
$$;

ALTER TABLE public.restaurants
ADD CONSTRAINT restaurants_theme_valid
CHECK (
  theme IN (
    'classic',
    'dark-modern',
    'luxury-gold',
    'ozt-glass-premium',
    'ozt-nova-premium',
    'aurora',
    'aurora-krem',
    'aurora-gold',
    'aurora-zeytin',
    'aurora-bordo',
    'aurora-lacivert',
    'aurora-mermer'
  )
) NOT VALID;

-- NOT VALID: mevcut satırlar kontrol edilmeden kısıt eklenir; beklenmeyen
-- eski bir tema değeri olsa bile migration hata vermez. Yeni kayıtlar ve
-- güncellemeler listeye göre denetlenir.

-- ---------------------------------------------------------------
-- Tema yalnızca sistem panelinden değiştirilir.
-- Restoran yöneticisi kendi restoranının diğer bilgilerini (telefon,
-- adres, saatler, WiFi...) güncellemeye devam eder; theme sütununu
-- yalnızca sistem yöneticisi veya sunucu (service role) değiştirebilir.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_restaurant_theme()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.theme IS NOT DISTINCT FROM OLD.theme THEN
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

  RAISE EXCEPTION 'Temayı yalnızca sistem yöneticisi değiştirebilir.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS protect_restaurant_theme ON public.restaurants;

CREATE TRIGGER protect_restaurant_theme
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.protect_restaurant_theme();
