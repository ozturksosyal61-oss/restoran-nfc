-- OZT DIGITAL MENU
-- Salt okunur demo yönetim paneli
--
-- /demo/panel bağlantısı ziyaretçiyi demo_users tablosundaki hesapla
-- Mira Kitchen paneline sokar. Bu hesap her şeyi görebilir ama hiçbir
-- şeyi değiştiremez. Koruma veritabanı seviyesindedir: panel kodunda bir
-- düğme gözden kaçsa bile yazma isteği burada reddedilir.
--
-- Müşteri tarafı (menüden sipariş, garson çağırma, değerlendirme) demo
-- restoranında çalışmaya devam eder; o işlemler güvenli fonksiyonlardan
-- (SECURITY DEFINER) geçtiği için bu kuraldan etkilenmez.

-- ---------------------------------------------------------------
-- 1) Demo hesapları
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demo_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Politika yok: tabloyu yalnızca sunucu (service role) okur ve yazar.
ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.demo_users WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_demo_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO anon, authenticated;

-- ---------------------------------------------------------------
-- 2) Demo hesabının tablolara doğrudan yazmasını engelle
--    Tetikleyici bilerek SECURITY DEFINER değildir: current_user,
--    isteği yapan roldür. Panel doğrudan yazdığında 'authenticated'
--    olur ve demo hesabı ise reddedilir. Müşteri fonksiyonlarının
--    içinden gelen yazmalarda current_user fonksiyon sahibidir.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_demo_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND public.is_demo_user() THEN
    RAISE EXCEPTION 'Demo panelinde değişiklik yapılamaz. Bu panel yalnızca inceleme içindir.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS block_demo_writes ON public.%I', t.relname);
    EXECUTE format(
      'CREATE TRIGGER block_demo_writes BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH STATEMENT EXECUTE FUNCTION public.block_demo_writes()',
      t.relname
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- 3) Panelin kullandığı iki güvenli fonksiyon da demo hesabını reddeder
--    (hesap kapatma ve "ödendi" işaretleme). Tanımlar aynı; yalnızca
--    baştaki demo kontrolü eklendi.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.close_dining_session(p_session_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurant_id bigint;
  v_has_incomplete_orders boolean;
BEGIN
  IF public.is_demo_user() THEN
    RAISE EXCEPTION 'Demo panelinde değişiklik yapılamaz. Bu panel yalnızca inceleme içindir.';
  END IF;

  SELECT restaurant_id
  INTO v_restaurant_id
  FROM public.dining_sessions
  WHERE id = p_session_id
    AND status = 'open';

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Açık hesap oturumu bulunamadı.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = v_restaurant_id
      AND ru.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu restoran için yetkiniz yok.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.session_id = p_session_id
      AND o.payment_status NOT IN ('paid', 'refunded')
      AND o.status <> 'delivered'
  )
  INTO v_has_incomplete_orders;

  IF v_has_incomplete_orders THEN
    RAISE EXCEPTION
      'Hesap kapatılamaz. Teslim edilmemiş sipariş bulunuyor.';
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid'
  WHERE session_id = p_session_id
    AND payment_status NOT IN ('paid', 'refunded');

  UPDATE public.dining_sessions
  SET
    status = 'closed',
    closed_at = now()
  WHERE id = p_session_id
    AND status = 'open';

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_order_paid_and_maybe_close_session(p_order_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id bigint;
  v_restaurant_id bigint;
  v_has_unpaid boolean;
BEGIN
  IF public.is_demo_user() THEN
    RAISE EXCEPTION 'Demo panelinde değişiklik yapılamaz. Bu panel yalnızca inceleme içindir.';
  END IF;

  SELECT
    o.session_id,
    o.restaurant_id
  INTO
    v_session_id,
    v_restaurant_id
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sipariş bulunamadı.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurant_users ru
    WHERE ru.restaurant_id = v_restaurant_id
      AND ru.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu restoran için yetkiniz yok.';
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid'
  WHERE id = p_order_id;

  IF v_session_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.session_id = v_session_id
      AND o.payment_status NOT IN ('paid', 'refunded')
  )
  INTO v_has_unpaid;

  IF NOT v_has_unpaid THEN
    UPDATE public.dining_sessions
    SET
      status = 'closed',
      closed_at = COALESCE(closed_at, now())
    WHERE id = v_session_id
      AND status = 'open';
  END IF;

  RETURN true;
END;
$function$;

-- ---------------------------------------------------------------
-- 4) Demo hesabı dosya yükleyemez, silemez, değiştiremez
--    (kısıtlayıcı politikalar mevcut izinlerin üstüne eklenir; okuma
--    etkilenmez)
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Demo users cannot upload" ON storage.objects;
CREATE POLICY "Demo users cannot upload"
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "Demo users cannot update files" ON storage.objects;
CREATE POLICY "Demo users cannot update files"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (NOT public.is_demo_user())
WITH CHECK (NOT public.is_demo_user());

DROP POLICY IF EXISTS "Demo users cannot delete files" ON storage.objects;
CREATE POLICY "Demo users cannot delete files"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (NOT public.is_demo_user());

-- ---------------------------------------------------------------
-- 5) Demo restoranında kişisel veri tutulmaz
--    Demo menüsünü deneyen ziyaretçilerin yazdığı ad ve iletişim bilgisi
--    kayıt anında boşaltılır; başka ziyaretçiler demo panelinde göremez.
-- ---------------------------------------------------------------

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE public.restaurants SET is_demo = true WHERE slug = 'mira-kitchen';

CREATE OR REPLACE FUNCTION public.strip_demo_personal_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE id = NEW.restaurant_id AND is_demo) THEN
    IF TG_TABLE_NAME = 'orders' THEN
      NEW.customer_name := NULL;
    ELSIF TG_TABLE_NAME = 'customer_feedback' THEN
      NEW.contact := NULL;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
      NEW.customer_name := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strip_demo_personal_data ON public.orders;
CREATE TRIGGER strip_demo_personal_data
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.strip_demo_personal_data();

DROP TRIGGER IF EXISTS strip_demo_personal_data ON public.customer_feedback;
CREATE TRIGGER strip_demo_personal_data
BEFORE INSERT OR UPDATE ON public.customer_feedback
FOR EACH ROW EXECUTE FUNCTION public.strip_demo_personal_data();

DROP TRIGGER IF EXISTS strip_demo_personal_data ON public.reviews;
CREATE TRIGGER strip_demo_personal_data
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.strip_demo_personal_data();

-- Daha önce girilmiş olanlar da temizlenir.
UPDATE public.orders SET customer_name = NULL
WHERE customer_name IS NOT NULL
  AND restaurant_id IN (SELECT id FROM public.restaurants WHERE is_demo);

UPDATE public.customer_feedback SET contact = NULL
WHERE contact IS NOT NULL
  AND restaurant_id IN (SELECT id FROM public.restaurants WHERE is_demo);

UPDATE public.reviews SET customer_name = NULL
WHERE customer_name IS NOT NULL
  AND restaurant_id IN (SELECT id FROM public.restaurants WHERE is_demo);
