-- OZT DIGITAL MENU
-- Güvenlik kilidi: paket / abonelik / ödeme / masa kodu / sipariş
--
-- SIRA:
--   1) 20260928_table_token_rpcs.sql çalıştırılır (yeni fonksiyonlar)
--   2) Uygulama kodu yayına alınır
--   3) BU dosya çalıştırılır
-- Aksi halde canlıdaki eski kod paket senkronizasyonu, sipariş ve
-- garson çağırma yapamaz.

-- ---------------------------------------------------------------
-- 1) restaurants: plan / is_active / slug / id yalnızca sistem
--    yöneticisi veya sunucu (service role) tarafından değiştirilebilir.
--    Telefon, adres, WiFi, saatler vb. restoran sahibinde kalır.
--    (Tema ayrı bir trigger ile korunur: 20260929_aurora_color_themes.sql.)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_restaurant_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role ve SQL Editor oturumsuz çalışır (auth.uid() boş).
  -- Anonim kullanıcıların UPDATE izni RLS'te zaten yok.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Paket, durum ve adres (slug) alanlarını yalnızca sistem yöneticisi değiştirebilir.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_restaurant_admin_fields ON public.restaurants;

CREATE TRIGGER protect_restaurant_admin_fields
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.protect_restaurant_admin_fields();

-- Aynı işi yapan iki kuraldan fazlalık olanı kaldır
-- ("restaurant_users_can_update_restaurant" aynı koşulla kalıyor).
DROP POLICY IF EXISTS "Users can update their own restaurant" ON public.restaurants;

-- ---------------------------------------------------------------
-- 2) subscriptions: restoran kullanıcıları yalnızca OKUYABİLİR.
--    Oluşturma / güncelleme sunucu API'lerinden (service role) ve
--    sistem yöneticisinden (ozt_system_admin_subscriptions) yapılır.
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Restaurant users and system admins can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Restaurant users and system admins can update subscriptions" ON public.subscriptions;

-- ---------------------------------------------------------------
-- 3) payment_transactions: restoran kullanıcıları ödeme kaydı
--    oluşturamaz / "başarılı" yapamaz; yalnızca okur.
--    Yazma sunucu API'lerinden (service role) ve sistem yöneticisinden.
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Restaurant users can create own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Restaurant users can update own payment transactions" ON public.payment_transactions;

-- ---------------------------------------------------------------
-- 4) reviews: restoran sahibi müşteri yorumunun metnini / puanını
--    değiştiremez; yalnızca göster / gizle (is_visible) yapabilir.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_review_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_system_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'is_visible' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'is_visible' - 'updated_at') THEN
    RAISE EXCEPTION 'Müşteri yorumlarında yalnızca görünürlük değiştirilebilir.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_review_content ON public.reviews;

CREATE TRIGGER protect_review_content
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.protect_review_content();

-- ---------------------------------------------------------------
-- 5) employees: çalışan telefonları giriş yapmamış ziyaretçilere
--    kapalı. Diğer sütunlar ("çalışanı değerlendir" sayfası için)
--    okunmaya devam eder.
-- ---------------------------------------------------------------

REVOKE SELECT ON public.employees FROM anon;

DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name <> 'phone';

  EXECUTE format('GRANT SELECT (%s) ON public.employees TO anon', cols);
END;
$$;

-- ---------------------------------------------------------------
-- 6) product-images: herhangi bir hesap yerine yalnızca bir restorana
--    bağlı kullanıcılar ve sistem yöneticileri görsel yükleyebilir.
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

CREATE POLICY "Restaurant users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE ru.user_id = auth.uid()
    )
    OR public.is_system_admin()
  )
);

-- ---------------------------------------------------------------
-- 7) restaurant_tables: masa kodları (public_token) artık herkese
--    açık listelenemez. Müşteri sayfaları masayı get_public_table
--    fonksiyonuyla, yalnızca doğru kodu bilerek doğrular.
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Public can read active restaurant tables" ON public.restaurant_tables;

-- ---------------------------------------------------------------
-- 8) Masa kodu istemeyen eski fonksiyonlar dışarıya kapatılır.
--    Yeni fonksiyonlar (create_table_order, create_table_service_request)
--    bunları içeriden kullanmaya devam eder.
-- ---------------------------------------------------------------

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_public_service_request',
        'create_public_order_with_session',
        'create_public_order',
        'get_or_create_open_dining_session'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      f.sig
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- 9) Sipariş, sipariş kalemi ve garson talebi tabloya doğrudan
--    eklenemez; yalnızca masa kodunu doğrulayan fonksiyonlarla.
--    (Önceden herkes, aktif bir restoranın herhangi bir siparişine
--    ürün ekleyebiliyordu.)
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create order items for active restaurant orders" ON public.order_items;
DROP POLICY IF EXISTS "Public can create valid service requests" ON public.service_requests;

-- ---------------------------------------------------------------
-- 10) Yorumlar: siparişe bağlı yorum yalnızca create_public_review
--     ile (teslim edilmiş sipariş, siparişte bir kez). Siparişsiz
--     yorumlar (çalışan değerlendirme) restoran onaylayana kadar gizli.
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Customers can create valid reviews" ON public.reviews;

CREATE POLICY "Customers can create employee reviews"
ON public.reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NULL
  AND rating BETWEEN 1 AND 5
);

CREATE OR REPLACE FUNCTION public.hide_unverified_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_id IS NULL
     AND NOT public.user_belongs_to_restaurant(NEW.restaurant_id) THEN
    NEW.is_visible := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hide_unverified_reviews ON public.reviews;

CREATE TRIGGER hide_unverified_reviews
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.hide_unverified_reviews();
