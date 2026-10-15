-- OZT DIGITAL MENU
-- Müşteri menüsü düzeltmeleri (tarayıcı testi, 1. aşama)
--
--  1) Masa hesabı: 6 saat hareketsiz kalan açık hesap müşteriye gösterilmez.
--     O masaya yeni sipariş gelince eski hesap "idle" nedeniyle kapatılır
--     (siparişlerin ödeme durumu değişmez; panelde geçmişte görünür).
--  2) Ödeme: işletmenin onaylamadığı (pending) siparişler ödenemez, hesapta
--     ayrı gösterilir; reddedilen (cancelled) siparişler hesapta görünmez.
--     Hesap tamamen ödense de onay bekleyen sipariş varsa hesap kapanmaz.
--  3) Sipariş: müşterinin yazdığı ad siparişe kaydedilir.
--  4) Garson / hesap çağrısı: müşteri ekranları aktif çağrıyı sunucudan okur
--     (get_table_service_state); tekrar çağırma bildirimi en erken 3 dakikada.
--  5) Alerjenler: 14 standart alerjen kodu (products.allergen_codes); mevcut
--     serbest metinler koda eşlenir. Eski metin sütunu yedek olarak kalır.
--  6) Çeviriler: içindekilere yapışan "Allergens: …" temizlenir, çevirideki
--     alerjen alanı kaldırılır (alerjenler artık sabit sözlükten çevrilir),
--     yapay zekâ notu sızmış çeviriler silinir (panelden yeniden çevrilir).
--  7) Mira Kitchen'daki memnuniyet.oztdigital.com.tr bağlantısı kaldırılır.

-- ---------------------------------------------------------------
-- 1) Masa hesabı: hareketsizlik
-- ---------------------------------------------------------------

ALTER TABLE public.dining_sessions
  ADD COLUMN IF NOT EXISTS closed_reason text;

-- Açık hesabın hareketsiz sayılacağı süre.
CREATE OR REPLACE FUNCTION public.table_session_idle_limit()
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$ SELECT interval '6 hours' $$;

-- Açık hesap, son siparişten (yoksa açılıştan) bu yana süreyi aştıysa eskidir.
CREATE OR REPLACE FUNCTION public.session_is_stale(p_session_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT ds.status = 'open'
       AND GREATEST(
             COALESCE(ds.opened_at, '-infinity'::timestamptz),
             COALESCE((SELECT max(o.created_at) FROM public.orders o WHERE o.session_id = ds.id), '-infinity'::timestamptz),
             COALESCE((SELECT max(t.created_at) FROM public.online_payments t WHERE t.session_id = ds.id), '-infinity'::timestamptz)
           ) < now() - public.table_session_idle_limit()
    FROM public.dining_sessions ds
    WHERE ds.id = p_session_id
  ), false);
$$;

-- Masanın güncel (eski olmayan) açık hesabı.
CREATE OR REPLACE FUNCTION public.active_table_session(p_restaurant_id bigint, p_table_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ds.id
  FROM public.dining_sessions ds
  WHERE ds.restaurant_id = p_restaurant_id
    AND ds.table_id = p_table_id
    AND ds.status = 'open'
    AND NOT public.session_is_stale(ds.id)
  ORDER BY ds.id DESC
  LIMIT 1;
$$;

-- Masanın eski açık hesaplarını kapatır (yalnızca yeni siparişte çağrılır).
CREATE OR REPLACE FUNCTION public.close_stale_table_sessions(p_restaurant_id bigint, p_table_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.dining_sessions ds
  SET status = 'closed',
      closed_at = now(),
      closed_reason = 'idle'
  WHERE ds.restaurant_id = p_restaurant_id
    AND ds.table_id = p_table_id
    AND ds.status = 'open'
    AND public.session_is_stale(ds.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.session_is_stale(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.active_table_session(bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_stale_table_sessions(bigint, bigint) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 4) Garson / hesap çağrısı durumu (müşteri ekranları)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_table_service_state(p_restaurant_id bigint, p_public_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id bigint;
BEGIN
  p_public_token := public.resolve_table_visit(p_restaurant_id, p_public_token, false);
  IF p_public_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT rt.id
  INTO v_table_id
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.public_token::text = p_public_token
    AND rt.is_active = true;

  IF v_table_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'type', sr.request_type,
        'status', sr.status,
        'created_at', sr.created_at,
        'last_called_at', COALESCE(sr.last_called_at, sr.created_at)
      )
      ORDER BY sr.created_at DESC
    )
    FROM public.service_requests sr
    WHERE sr.restaurant_id = p_restaurant_id
      AND sr.table_id = v_table_id
      AND sr.status IN ('pending', 'acknowledged')
      AND sr.created_at > now() - interval '30 minutes'
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_service_state(bigint, text) TO anon, authenticated;

-- ---------------------------------------------------------------
-- 5) Alerjenler: 14 standart alerjen
-- ---------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS allergen_codes text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_allergen_codes_known') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_allergen_codes_known CHECK (
        allergen_codes <@ ARRAY[
          'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk',
          'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'
        ]::text[]
      );
  END IF;
END;
$$;

-- Mevcut serbest metinlerin koda eşlenmesi (yalnızca kodu boş ürünler).
UPDATE public.products p
SET allergen_codes = m.codes
FROM (
  SELECT p2.id,
         ARRAY(
           SELECT a.code
           FROM (VALUES
             (1,  'gluten',      'gluten|buğday|\mun\M|arpa|çavdar|yulaf|irmik'),
             (2,  'crustaceans', 'kabuklu deniz|karides|yengeç|ıstakoz|kerevit'),
             (3,  'eggs',        'yumurta'),
             (4,  'fish',        'balık|somon|hamsi|levrek|çipura|ton balığı'),
             (5,  'peanuts',     'yer fıstığ|yerfıstığ'),
             (6,  'soy',         'soya'),
             (7,  'milk',        'süt|laktoz|peynir|krema|tereyağ|yoğurt|kaymak'),
             (8,  'nuts',        'fındık|ceviz|badem|kaju|antep fıstığ|çam fıstığ|kuruyemiş|kuru yemiş|sert kabuklu|pekan|makadamya'),
             (9,  'celery',      'kereviz'),
             (10, 'mustard',     'hardal'),
             (11, 'sesame',      'susam|tahin'),
             (12, 'sulphites',   'sülfit|kükürt'),
             (13, 'lupin',       'acı bakla|lupin'),
             (14, 'molluscs',    'yumuşakça|midye|kalamar|ahtapot|istiridye|salyangoz')
           ) AS a(ord, code, pattern)
           WHERE lower(p2.allergens) ~ a.pattern
           ORDER BY a.ord
         ) AS codes
  FROM public.products p2
  WHERE NULLIF(trim(COALESCE(p2.allergens, '')), '') IS NOT NULL
) m
WHERE p.id = m.id
  AND p.allergen_codes = '{}';

-- ---------------------------------------------------------------
-- 6) Bozuk çevirilerin temizliği
-- ---------------------------------------------------------------

DO $$
DECLARE
  r record;
  v_lang text;
  v_entry jsonb;
  v_ing text;
  v_clean jsonb;
  v_bad constant text := '(allerg|alerjen|\mwait\M|let''s|context|translat|übersetz|original|strictly|\|)';
BEGIN
  FOR r IN
    SELECT id, translations
    FROM public.products
    WHERE translations IS NOT NULL
      AND jsonb_typeof(translations) = 'object'
      AND translations <> '{}'::jsonb
  LOOP
    v_clean := '{}'::jsonb;

    FOR v_lang, v_entry IN SELECT key, value FROM jsonb_each(r.translations) LOOP
      IF jsonb_typeof(v_entry) <> 'object' THEN
        CONTINUE;
      END IF;

      -- Alerjenler artık sabit sözlükten çevrilir.
      v_entry := v_entry - 'allergens';

      -- İçindekilere yapışmış "Allergens: …" kısmı atılır.
      v_ing := v_entry->>'ingredients';
      IF v_ing IS NOT NULL THEN
        v_ing := btrim(regexp_replace(v_ing, '[,.;]?\s*(allergens?|allergene|alerjenler?)\s*:.*$', '', 'i'), ' ,.;');
        v_entry := CASE WHEN v_ing = '' THEN v_entry - 'ingredients'
                        ELSE jsonb_set(v_entry, '{ingredients}', to_jsonb(v_ing)) END;
      END IF;

      -- Hâlâ yapay zekâ notu içeren çeviri silinir; panelden yeniden çevrilir.
      IF (v_entry - 'src')::text ~* v_bad THEN
        CONTINUE;
      END IF;

      v_clean := v_clean || jsonb_build_object(v_lang, v_entry);
    END LOOP;

    IF v_clean IS DISTINCT FROM r.translations THEN
      UPDATE public.products SET translations = v_clean WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- 7) Kullanılmayan memnuniyet bağlantısı
-- ---------------------------------------------------------------

UPDATE public.restaurants
SET google_review_url = NULL
WHERE google_review_url ILIKE '%memnuniyet.oztdigital%';

-- ---------------------------------------------------------------
-- 1–4) Fonksiyonlar (son sürümler; yalnızca belirtilen satırlar değişti)
-- ---------------------------------------------------------------

-- get_public_dining_bill: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.get_public_dining_bill(p_restaurant_id bigint, p_table_id bigint, p_public_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_table_number text;
  v_session_id bigint;
  v_orders jsonb;
  v_order_total numeric := 0;
  v_due_total numeric := 0;
  v_unconfirmed_total numeric := 0;
BEGIN
  -- Masa ziyaret kodu, masanın gerçek koduna çevrilir (20261030).
  p_public_token := public.resolve_table_visit(p_restaurant_id, p_public_token, false);

  SELECT table_number::text
  INTO v_table_number
  FROM public.restaurant_tables
  WHERE id = p_table_id
    AND restaurant_id = p_restaurant_id
    AND public_token::text = p_public_token
    AND is_active = true;

  IF v_table_number IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulaması başarısız.';
  END IF;

  v_session_id := public.active_table_session(p_restaurant_id, p_table_id);

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'open', false,
      'session_id', null,
      'restaurant_id', p_restaurant_id,
      'table_id', p_table_id,
      'table_number', v_table_number,
      'orders', '[]'::jsonb,
      'order_total', 0,
      'due_total', 0,
      'unconfirmed_total', 0
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'daily_number', o.daily_number,
        'created_at', o.created_at,
        'customer_name', COALESCE(o.customer_name, 'Misafir'),
        'note', o.note,
        'status', o.status,
        'payment_status', COALESCE(o.payment_status, 'unpaid'),
        'payment_method', o.payment_method,
        'total_amount', COALESCE(o.total_amount, 0),
        'items', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_name', oi.product_name,
              'price', COALESCE(oi.price, 0),
              'quantity', COALESCE(oi.quantity, 0)
            )
            ORDER BY oi.id
          )
          FROM public.order_items oi
          WHERE oi.order_id = o.id
        ), '[]'::jsonb)
      )
      ORDER BY o.created_at ASC, o.id ASC
    ),
    '[]'::jsonb
  )
  INTO v_orders
  FROM public.orders o
  WHERE o.session_id = v_session_id
    AND COALESCE(o.status, '') <> 'cancelled'
    AND COALESCE(o.payment_status, 'unpaid') <> 'refunded';

  SELECT COALESCE(SUM(COALESCE(o.total_amount, 0)), 0)
  INTO v_order_total
  FROM public.orders o
  WHERE o.session_id = v_session_id
    AND COALESCE(o.status, '') <> 'cancelled'
    AND COALESCE(o.payment_status, 'unpaid') <> 'refunded';

  -- Ödenecek: onaylanmış, ödenmemiş siparişler. Onay bekleyenler ayrı.
  SELECT
    COALESCE(SUM(COALESCE(o.total_amount, 0)) FILTER (WHERE o.status <> 'pending'), 0),
    COALESCE(SUM(COALESCE(o.total_amount, 0)) FILTER (WHERE o.status = 'pending'), 0)
  INTO v_due_total, v_unconfirmed_total
  FROM public.orders o
  WHERE o.session_id = v_session_id
    AND COALESCE(o.status, '') <> 'cancelled'
    AND COALESCE(o.payment_status, 'unpaid') NOT IN ('paid', 'refunded');

  RETURN jsonb_build_object(
    'open', true,
    'session_id', v_session_id,
    'restaurant_id', p_restaurant_id,
    'table_id', p_table_id,
    'table_number', v_table_number,
    'orders', v_orders,
    'order_total', v_order_total,
    'due_total', v_due_total,
    'unconfirmed_total', v_unconfirmed_total
  );
END;
$function$;

-- resolve_table_visit: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.resolve_table_visit(
  p_restaurant_id bigint,
  p_token text,
  p_write boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v record;
  v_open bigint;
BEGIN
  IF p_token IS NULL
     OR p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  SELECT tv.token, tv.table_id, tv.dining_session_id, tv.created_at, tv.last_used_at,
         rt.public_token::text AS table_token
  INTO v
  FROM public.table_visits tv
  JOIN public.restaurant_tables rt
    ON rt.id = tv.table_id
   AND rt.restaurant_id = tv.restaurant_id
   AND rt.is_active = true
  WHERE tv.token = p_token::uuid
    AND tv.restaurant_id = p_restaurant_id;

  IF NOT FOUND THEN
    -- Masanın kendi kodu yalnızca okuma için geçerli.
    IF p_write THEN
      RETURN NULL;
    END IF;

    RETURN (
      SELECT rt.public_token::text
      FROM public.restaurant_tables rt
      WHERE rt.restaurant_id = p_restaurant_id
        AND rt.public_token = p_token::uuid
        AND rt.is_active = true
    );
  END IF;

  IF NOT p_write THEN
    IF v.created_at < now() - interval '24 hours' THEN
      RETURN NULL;
    END IF;
    RETURN v.table_token;
  END IF;

  IF v.last_used_at < now() - interval '4 hours'
     OR v.created_at < now() - interval '16 hours' THEN
    RETURN NULL;
  END IF;

  -- Ziyaretin hesabı kapandıysa (hesaba bağlanmamışsa: ziyaretten sonra
  -- masada kapanan herhangi bir hesap) ziyaret biter.
  IF EXISTS (
    SELECT 1
    FROM public.dining_sessions ds
    WHERE ds.restaurant_id = p_restaurant_id
      AND ds.table_id = v.table_id
      AND ds.status <> 'open'
      AND ds.closed_at > v.created_at
      -- Hareketsizlikten kapatılan eski hesap yeni ziyaretleri bitirmez (20261104).
      AND COALESCE(ds.closed_reason, '') <> 'idle'
      AND (v.dining_session_id IS NULL OR ds.id = v.dining_session_id)
  ) THEN
    RETURN NULL;
  END IF;

  IF v.dining_session_id IS NULL THEN
    v_open := public.active_table_session(p_restaurant_id, v.table_id);
  END IF;

  -- Kullanım zamanı en fazla 5 dakikada bir yazılır.
  IF v_open IS NOT NULL OR v.last_used_at < now() - interval '5 minutes' THEN
    UPDATE public.table_visits
    SET last_used_at = now(),
        dining_session_id = COALESCE(dining_session_id, v_open)
    WHERE token = v.token;
  END IF;

  RETURN v.table_token;
END;
$$;

-- get_public_table: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.get_public_table(
  p_restaurant_id bigint,
  p_public_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_visit uuid;
  v_table_id bigint;
  v_open bigint;
BEGIN
  IF p_public_token IS NULL
     OR p_public_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  IF public.resolve_table_visit(p_restaurant_id, p_public_token, true) IS NOT NULL THEN
    v_visit := p_public_token::uuid;
  ELSE
    SELECT rt.id
    INTO v_table_id
    FROM public.restaurant_tables rt
    WHERE rt.restaurant_id = p_restaurant_id
      AND rt.public_token = p_public_token::uuid
      AND rt.is_active = true;

    IF v_table_id IS NULL THEN
      RETURN NULL;
    END IF;

    -- Eski ziyaretler temizlenir.
    DELETE FROM public.table_visits
    WHERE table_id = v_table_id
      AND created_at < now() - interval '2 days';

    -- Aynı masaya çok sık istek gelirse yeni kayıt açılmaz.
    IF (
      SELECT count(*)
      FROM public.table_visits
      WHERE table_id = v_table_id
        AND created_at > now() - interval '10 minutes'
    ) >= 100 THEN
      SELECT token
      INTO v_visit
      FROM public.table_visits
      WHERE table_id = v_table_id
      ORDER BY created_at DESC
      LIMIT 1;
    ELSE
      v_open := public.active_table_session(p_restaurant_id, v_table_id);

      INSERT INTO public.table_visits (restaurant_id, table_id, dining_session_id)
      VALUES (p_restaurant_id, v_table_id, v_open)
      RETURNING token INTO v_visit;
    END IF;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'id', rt.id,
      'table_number', rt.table_number,
      'public_token', v_visit::text,
      'is_active', rt.is_active
    )
    FROM public.table_visits tv
    JOIN public.restaurant_tables rt ON rt.id = tv.table_id
    WHERE tv.token = v_visit
  );
END;
$$;

-- get_public_order: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.get_public_order(p_order_id bigint, p_table_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'order',
    jsonb_build_object(
      'id', o.id,
      'daily_number', o.daily_number,
      'restaurant_id', o.restaurant_id,
      'table_id', o.table_id,
      'table_number', o.table_number,
      'customer_name', o.customer_name,
      'note', o.note,
      'total_amount', o.total_amount,
      'payment_method', o.payment_method,
      'payment_status', o.payment_status,
      'status', o.status,
      'created_at', o.created_at
    ),
    'items',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'price', oi.price,
            'quantity', oi.quantity,
            'created_at', oi.created_at
          )
          ORDER BY oi.id
        )
        FROM public.order_items oi
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  FROM public.orders o
  INNER JOIN public.restaurant_tables rt
    ON rt.id = o.table_id
   AND rt.restaurant_id = o.restaurant_id
  INNER JOIN public.dining_sessions ds
    ON ds.id = o.session_id
   AND ds.status = 'open'
   AND NOT public.session_is_stale(ds.id)
  WHERE o.id = p_order_id
    AND rt.public_token::text = public.resolve_table_visit(o.restaurant_id, p_table_token, false)
    AND rt.is_active = true
  LIMIT 1;
$function$;

-- create_table_service_request: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.create_table_service_request(
  p_restaurant_id bigint,
  p_public_token text,
  p_request_type text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id bigint;
  v_open record;
BEGIN
  -- Masa ziyaret kodu, masanın gerçek koduna çevrilir (20261030).
  p_public_token := public.resolve_table_visit(p_restaurant_id, p_public_token, true);
  IF p_public_token IS NULL THEN
    RAISE EXCEPTION 'Masa oturumunuz sona erdi. Lütfen masadaki QR kodu yeniden okutun.';
  END IF;

  SELECT rt.id
  INTO v_table_id
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.public_token::text = p_public_token
    AND rt.is_active = true;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulaması başarısız.';
  END IF;

  -- Unutulmuş eski çağrılar kapatılır; yeni çağrı açılabilsin.
  UPDATE public.service_requests
  SET status = 'completed', completed_at = now()
  WHERE restaurant_id = p_restaurant_id
    AND table_id = v_table_id
    AND request_type = p_request_type
    AND status IN ('pending', 'acknowledged')
    AND created_at < now() - interval '30 minutes';

  -- Yakın zamanda açılmış çağrı varsa: tekrar çağırma (bildirim).
  SELECT sr.id, COALESCE(sr.last_called_at, sr.created_at) AS last_call
  INTO v_open
  FROM public.service_requests sr
  WHERE sr.restaurant_id = p_restaurant_id
    AND sr.table_id = v_table_id
    AND sr.request_type = p_request_type
    AND sr.status IN ('pending', 'acknowledged')
  ORDER BY sr.created_at DESC
  LIMIT 1;

  IF v_open.id IS NOT NULL THEN
    IF v_open.last_call < now() - interval '3 minutes' THEN
      UPDATE public.service_requests
      SET last_called_at = now(), status = 'pending'
      WHERE id = v_open.id;
    END IF;
    RETURN v_open.id;
  END IF;

  RETURN public.create_public_service_request(
    p_restaurant_id,
    v_table_id,
    p_request_type
  );
END;
$$;

-- create_table_order: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.create_table_order(
  p_restaurant_id bigint,
  p_public_token text,
  p_customer_name text,
  p_note text,
  p_payment_method text,
  p_items jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id bigint;
  v_table_number text;
  v_item_count integer;
  v_valid_count integer;
  v_items jsonb;
  v_total numeric;
  v_order_id bigint;
BEGIN
  -- Masa ziyaret kodu, masanın gerçek koduna çevrilir (20261030).
  p_public_token := public.resolve_table_visit(p_restaurant_id, p_public_token, true);
  IF p_public_token IS NULL THEN
    RAISE EXCEPTION 'Masa oturumunuz sona erdi. Lütfen masadaki QR kodu yeniden okutun.';
  END IF;

  IF NOT public.is_active_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'Restoran şu anda sipariş almıyor.';
  END IF;

  SELECT rt.id, rt.table_number::text
  INTO v_table_id, v_table_number
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.public_token::text = p_public_token
    AND rt.is_active = true;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulaması başarısız.';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sepet boş.';
  END IF;

  v_item_count := jsonb_array_length(p_items);

  IF v_item_count > 100 THEN
    RAISE EXCEPTION 'Sepette çok fazla ürün var.';
  END IF;

  -- Her kalem: bu restorana ait, satışta olan bir ürün ve 1-99 adet.
  -- Fiyat: ürün fiyatı, aktif kampanya varsa kampanyalı fiyat.
  SELECT
    count(*),
    jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'product_name', p.name,
        'price', sp.unit_price,
        'quantity', (e.value->>'quantity')::integer
      )
      ORDER BY e.ord
    ),
    COALESCE(sum(sp.unit_price * (e.value->>'quantity')::integer), 0)
  INTO v_valid_count, v_items, v_total
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(value, ord)
  JOIN public.products p
    ON p.id = (e.value->>'product_id')::bigint
  JOIN public.categories c
    ON c.id = p.category_id
   AND c.restaurant_id = p_restaurant_id
  CROSS JOIN LATERAL (
    SELECT public.product_sale_price(p_restaurant_id, p.id, c.id, p.price) AS unit_price
  ) sp
  WHERE (e.value->>'quantity')::integer BETWEEN 1 AND 99
    AND p.is_available IS DISTINCT FROM false;

  IF v_valid_count <> v_item_count THEN
    RAISE EXCEPTION 'Sepetteki bazı ürünler artık satışta değil. Lütfen sepetinizi güncelleyin.';
  END IF;

  -- 6 saattir hareketsiz açık hesap kapatılır; yeni sipariş yeni hesaba
  -- girer (önceki müşterinin siparişleri yeni müşteriye görünmez).
  PERFORM public.close_stale_table_sessions(p_restaurant_id, v_table_id);

  v_order_id := public.create_public_order_with_session(
    p_restaurant_id,
    v_table_id,
    v_table_number,
    NULLIF(left(trim(COALESCE(p_customer_name, '')), 80), ''),
    NULLIF(left(trim(COALESCE(p_note, '')), 500), ''),
    v_total,
    COALESCE(NULLIF(p_payment_method, ''), 'cash'),
    v_items
  );

  -- Müşterinin yazdığı ad siparişe yazılır (oturum fonksiyonu kaydetmeyebiliyor).
  UPDATE public.orders
  SET customer_name = NULLIF(left(trim(COALESCE(p_customer_name, '')), 80), '')
  WHERE id = v_order_id
    AND customer_name IS NULL
    AND NULLIF(trim(COALESCE(p_customer_name, '')), '') IS NOT NULL;

  -- Kalem fiyatları ve toplam kampanyalı fiyatla kesinleşir.
  UPDATE public.order_items oi
  SET price = public.product_sale_price(p_restaurant_id, p.id, p.category_id, p.price)
  FROM public.products p
  WHERE oi.order_id = v_order_id
    AND p.id = oi.product_id;

  UPDATE public.orders o
  SET total_amount = (
    SELECT COALESCE(sum(COALESCE(oi.price, 0) * COALESCE(oi.quantity, 0)), 0)
    FROM public.order_items oi
    WHERE oi.order_id = v_order_id
  )
  WHERE o.id = v_order_id;

  RETURN v_order_id;
END;
$$;

-- get_table_payment_state: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.get_table_payment_state(
  p_restaurant_id bigint,
  p_public_token text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id bigint;
  v_table_number text;
  v_session_id bigint;
BEGIN
  -- Masa ziyaret kodu, masanın gerçek koduna çevrilir (20261030).
  p_public_token := public.resolve_table_visit(p_restaurant_id, p_public_token, false);

  SELECT id, table_number::text
  INTO v_table_id, v_table_number
  FROM public.restaurant_tables
  WHERE restaurant_id = p_restaurant_id
    AND public_token::text = p_public_token
    AND is_active = true;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulanamadı. Lütfen masadaki QR kodu yeniden okutun.';
  END IF;

  v_session_id := public.active_table_session(p_restaurant_id, v_table_id);

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('open', false, 'table_number', v_table_number);
  END IF;

  RETURN public.table_payment_snapshot(v_session_id)
    || jsonb_build_object('open', true, 'table_number', v_table_number);
END;
$$;

-- reserve_table_payment: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.reserve_table_payment(
  p_restaurant_id bigint,
  p_public_token text,
  p_mode text,
  p_items jsonb,
  p_split_of integer,
  p_parts integer,
  p_tip numeric,
  p_reference text,
  p_provider text,
  p_pay_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_id bigint;
  v_table_number text;
  v_session_id bigint;
  v_state jsonb;
  v_remaining numeric;
  v_amount numeric := 0;
  v_tip numeric := round(GREATEST(COALESCE(p_tip, 0), 0), 2);
  v_allocs jsonb := '[]'::jsonb;
  v_item jsonb;
  v_sel record;
  v_avail numeric;
  v_line numeric;
  v_free_units numeric;
  v_selected_units numeric := 0;
  v_split_total numeric;
  v_parts_taken integer := 0;
  v_tx uuid;
BEGIN
  -- Masa ziyaret kodu, masanın gerçek koduna çevrilir (20261030).
  p_public_token := public.resolve_table_visit(p_restaurant_id, p_public_token, true);
  IF p_public_token IS NULL THEN
    RAISE EXCEPTION 'Masa oturumunuz sona erdi. Lütfen masadaki QR kodu yeniden okutun.';
  END IF;

  IF p_mode NOT IN ('full', 'items', 'equal') THEN
    RAISE EXCEPTION 'Geçersiz ödeme şekli.';
  END IF;

  SELECT id, table_number::text
  INTO v_table_id, v_table_number
  FROM public.restaurant_tables
  WHERE restaurant_id = p_restaurant_id
    AND public_token::text = p_public_token
    AND is_active = true;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulanamadı. Lütfen masadaki QR kodu yeniden okutun.';
  END IF;

  -- Aynı masadaki eşzamanlı ödemeler sırayla işlenir.
  v_session_id := public.active_table_session(p_restaurant_id, v_table_id);
  IF v_session_id IS NOT NULL THEN
    PERFORM 1 FROM public.dining_sessions WHERE id = v_session_id FOR UPDATE;
  END IF;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Bu masada açık hesap yok.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.online_payments
    WHERE session_id = v_session_id
      AND status = 'pending'
      AND expires_at > now()
  ) >= 8 THEN
    RAISE EXCEPTION 'Bu masada yarım kalmış çok sayıda ödeme var. Birkaç dakika sonra tekrar deneyin.';
  END IF;

  v_state := public.table_payment_snapshot(v_session_id);
  v_remaining := (v_state->>'remaining')::numeric;

  IF v_remaining <= 0.009 THEN
    IF (v_state->>'pending_total')::numeric > 0 THEN
      RAISE EXCEPTION 'Kalan hesap şu anda masadaki başka biri tarafından ödeniyor.';
    END IF;
    RAISE EXCEPTION 'Ödenecek tutar kalmadı.';
  END IF;

  SELECT COALESCE(sum(GREATEST((i->>'quantity')::numeric - (i->>'taken_units')::numeric, 0)), 0)
  INTO v_free_units
  FROM jsonb_array_elements(v_state->'items') i;

  IF p_mode = 'full' THEN
    -- Kalan hesabın tamamı; boştaki tüm ürünler bu ödemeye ayrılır.
    v_amount := v_remaining;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', (i->>'id')::bigint,
      'units', (i->>'quantity')::numeric - (i->>'taken_units')::numeric,
      'amount', round(((i->>'quantity')::numeric - (i->>'taken_units')::numeric) * (i->>'unit_price')::numeric, 2)
    )), '[]'::jsonb)
    INTO v_allocs
    FROM jsonb_array_elements(v_state->'items') i
    WHERE (i->>'quantity')::numeric - (i->>'taken_units')::numeric > 0.001;

  ELSIF p_mode = 'items' THEN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 200 THEN
      RAISE EXCEPTION 'Ödemek istediğiniz ürünleri seçin.';
    END IF;

    IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) THEN
      RAISE EXCEPTION 'Ürün seçimi geçersiz. Sayfayı yenileyin.';
    END IF;

    FOR v_sel IN
      SELECT (x->>'id')::bigint AS id, round((x->>'units')::numeric, 4) AS units
      FROM jsonb_array_elements(p_items) x
    LOOP
      SELECT i
      INTO v_item
      FROM jsonb_array_elements(v_state->'items') i
      WHERE (i->>'id')::bigint = v_sel.id;

      IF v_item IS NULL THEN
        RAISE EXCEPTION 'Seçtiğiniz ürünlerden biri artık hesapta değil. Sayfayı yenileyin.';
      END IF;

      v_avail := (v_item->>'quantity')::numeric - (v_item->>'taken_units')::numeric;

      IF v_sel.units IS NULL OR v_sel.units <= 0 OR v_sel.units > v_avail + 0.001 THEN
        RAISE EXCEPTION '"%" ödendi ya da şu anda masadaki başka biri tarafından ödeniyor. Sayfayı yenileyin.',
          v_item->>'name';
      END IF;

      v_line := round(LEAST(v_sel.units, v_avail) * (v_item->>'unit_price')::numeric, 2);
      v_amount := v_amount + v_line;
      v_selected_units := v_selected_units + LEAST(v_sel.units, v_avail);
      v_allocs := v_allocs || jsonb_build_array(jsonb_build_object(
        'id', v_sel.id,
        'units', LEAST(v_sel.units, v_avail),
        'amount', v_line
      ));
    END LOOP;

    -- Son ürünler ödeniyorsa kuruş farkı kalmasın.
    IF v_free_units - v_selected_units <= 0.001 THEN
      v_amount := v_remaining;
    END IF;
    v_amount := LEAST(v_amount, v_remaining);

  ELSE
    IF p_split_of IS NULL OR p_split_of < 2 OR p_split_of > 20 THEN
      RAISE EXCEPTION 'Kişi sayısı 2 ile 20 arasında olmalı.';
    END IF;

    IF jsonb_typeof(v_state->'split') = 'object'
       AND ((v_state->'split'->>'of')::integer = p_split_of
            OR (v_state->'split'->>'parts_taken')::integer > 0) THEN
      IF (v_state->'split'->>'of')::integer <> p_split_of THEN
        RAISE EXCEPTION 'Hesap % kişiye bölünmüş. Sayfayı yenileyin.', v_state->'split'->>'of';
      END IF;
      v_split_total := (v_state->'split'->>'total')::numeric;
      v_parts_taken := (v_state->'split'->>'parts_taken')::integer;
    ELSE
      -- Yeni bölüşme: kalan tutar N kişiye bölünür.
      v_split_total := v_remaining;
      v_parts_taken := 0;
      UPDATE public.dining_sessions
      SET split_of = p_split_of,
          split_total = v_remaining,
          split_base = (v_state->>'open_total')::numeric,
          split_set_at = now()
      WHERE id = v_session_id;
    END IF;

    IF p_parts IS NULL OR p_parts < 1 OR v_parts_taken + p_parts > p_split_of THEN
      RAISE EXCEPTION 'Ödenecek pay kalmadı ya da pay sayısı geçersiz. Sayfayı yenileyin.';
    END IF;

    v_amount := round(v_split_total / p_split_of * p_parts, 2);
    IF v_parts_taken + p_parts = p_split_of THEN
      v_amount := v_remaining;
    END IF;
    v_amount := LEAST(v_amount, v_remaining);
  END IF;

  v_amount := round(v_amount, 2);

  IF v_amount < 1 THEN
    RAISE EXCEPTION 'Online ödeme en az 1 ₺ olmalı. Kalan küçük tutarı garsonunuza ödeyebilirsiniz.';
  END IF;

  IF v_tip > v_amount THEN
    RAISE EXCEPTION 'Bahşiş, hesap payınızdan fazla olamaz.';
  END IF;

  INSERT INTO public.online_payments (
    restaurant_id, kind, provider, mode, reference, amount, tip_amount,
    session_id, table_id, split_mode, split_of, split_parts, expires_at
  )
  VALUES (
    p_restaurant_id, 'bill', p_provider, p_pay_mode, p_reference, v_amount + v_tip, v_tip,
    v_session_id, v_table_id, p_mode,
    CASE WHEN p_mode = 'equal' THEN p_split_of END,
    CASE WHEN p_mode = 'equal' THEN p_parts END,
    now() + interval '20 minutes'
  )
  RETURNING id INTO v_tx;

  INSERT INTO public.payment_allocations (transaction_id, order_item_id, units, amount)
  SELECT v_tx, (a->>'id')::bigint, round((a->>'units')::numeric, 4), (a->>'amount')::numeric
  FROM jsonb_array_elements(v_allocs) a
  WHERE round((a->>'units')::numeric, 4) > 0;

  RETURN jsonb_build_object(
    'id', v_tx,
    'amount', v_amount + v_tip,
    'bill_amount', v_amount,
    'tip', v_tip,
    'table_number', v_table_number
  );
END;
$$;

-- table_payment_snapshot: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.table_payment_snapshot(p_session_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_total numeric := 0;
  v_paid numeric := 0;
  v_pending numeric := 0;
  v_items jsonb;
  v_split_row record;
  v_split jsonb := NULL;
  v_parts_taken integer := 0;
  v_unconfirmed numeric := 0;
BEGIN
  -- İşletmenin henüz onaylamadığı siparişler ödenemez; ayrıca gösterilir.
  SELECT COALESCE(sum(COALESCE(o.total_amount, 0)), 0)
  INTO v_unconfirmed
  FROM public.orders o
  WHERE o.session_id = p_session_id
    AND o.status = 'pending'
    AND COALESCE(o.payment_status, 'unpaid') NOT IN ('paid', 'refunded');

  -- Ödenmemiş (garsona ödenenler hariç), onaylanmış ve iptal edilmemiş siparişler.
  SELECT COALESCE(sum(COALESCE(o.total_amount, 0)), 0)
  INTO v_open_total
  FROM public.orders o
  WHERE o.session_id = p_session_id
    AND COALESCE(o.status, '') NOT IN ('cancelled', 'pending')
    AND COALESCE(o.payment_status, 'unpaid') NOT IN ('paid', 'refunded');

  -- Online ödenen ve şu an ödenmekte olan tutar (bahşiş hariç).
  SELECT
    COALESCE(sum(t.amount - t.tip_amount) FILTER (WHERE t.status = 'success'), 0),
    COALESCE(sum(t.amount - t.tip_amount) FILTER (WHERE t.status = 'pending' AND t.expires_at > now()), 0)
  INTO v_paid, v_pending
  FROM public.online_payments t
  WHERE t.session_id = p_session_id
    AND t.kind = 'bill';

  -- Ürünler. Birim fiyat, siparişteki indirim oranına göre ölçeklenir
  -- (kampanyalı siparişte ürün toplamı sipariş tutarından büyük olabilir).
  WITH open_orders AS (
    SELECT
      o.id,
      COALESCE(o.total_amount, 0) AS total,
      (
        SELECT COALESCE(sum(COALESCE(oi.price, 0) * COALESCE(oi.quantity, 0)), 0)
        FROM public.order_items oi
        WHERE oi.order_id = o.id
      ) AS items_total
    FROM public.orders o
    WHERE o.session_id = p_session_id
      AND COALESCE(o.status, '') NOT IN ('cancelled', 'pending')
      AND COALESCE(o.payment_status, 'unpaid') NOT IN ('paid', 'refunded')
  ),
  alloc AS (
    SELECT
      a.order_item_id,
      sum(a.units) FILTER (WHERE t.status = 'success') AS paid_units,
      sum(a.units) FILTER (
        WHERE t.status = 'success' OR (t.status = 'pending' AND t.expires_at > now())
      ) AS taken_units
    FROM public.payment_allocations a
    JOIN public.online_payments t ON t.id = a.transaction_id
    WHERE t.session_id = p_session_id
    GROUP BY a.order_item_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'name', oi.product_name,
        'quantity', COALESCE(oi.quantity, 0),
        'unit_price', round(
          COALESCE(oi.price, 0) * CASE WHEN oo.items_total > 0 THEN oo.total / oo.items_total ELSE 1 END,
          4
        ),
        'paid_units', COALESCE(al.paid_units, 0),
        'taken_units', COALESCE(al.taken_units, 0)
      )
      ORDER BY oi.order_id, oi.id
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM open_orders oo
  JOIN public.order_items oi ON oi.order_id = oo.id
  LEFT JOIN alloc al ON al.order_item_id = oi.id
  WHERE COALESCE(oi.quantity, 0) > 0;

  -- Eşit bölüşme: hesaba yeni sipariş eklenirse ya da bir sipariş garsona
  -- ödenirse eski bölüşme geçersiz olur.
  SELECT split_of, split_total, split_base, split_set_at
  INTO v_split_row
  FROM public.dining_sessions
  WHERE id = p_session_id;

  IF v_split_row.split_of IS NOT NULL AND v_split_row.split_base = v_open_total THEN
    SELECT COALESCE(sum(t.split_parts), 0)
    INTO v_parts_taken
    FROM public.online_payments t
    WHERE t.session_id = p_session_id
      AND t.kind = 'bill'
      AND t.split_mode = 'equal'
      AND t.split_of = v_split_row.split_of
      AND t.created_at >= v_split_row.split_set_at
      AND (t.status = 'success' OR (t.status = 'pending' AND t.expires_at > now()));

    v_split := jsonb_build_object(
      'of', v_split_row.split_of,
      'total', v_split_row.split_total,
      'share', round(v_split_row.split_total / v_split_row.split_of, 2),
      'parts_taken', v_parts_taken
    );
  END IF;

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'open_total', v_open_total,
    'paid_total', v_paid,
    'pending_total', v_pending,
    'due', GREATEST(v_open_total - v_paid, 0),
    'remaining', GREATEST(v_open_total - v_paid - v_pending, 0),
    'items', v_items,
    'split', v_split,
    'unconfirmed_total', v_unconfirmed
  );
END;
$$;

-- settle_table_payment: son sürüm + 20261104 değişiklikleri
CREATE OR REPLACE FUNCTION public.settle_table_payment(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id bigint;
  v_state jsonb;
  v_closed boolean := false;
BEGIN
  SELECT session_id
  INTO v_session_id
  FROM public.online_payments
  WHERE id = p_transaction_id
    AND kind = 'bill'
    AND status = 'success';

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('closed', false);
  END IF;

  PERFORM 1 FROM public.dining_sessions WHERE id = v_session_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('closed', false);
  END IF;

  v_state := public.table_payment_snapshot(v_session_id);

  IF (v_state->>'open_total')::numeric > 0
     AND (v_state->>'open_total')::numeric - (v_state->>'paid_total')::numeric <= 0.01 THEN
    UPDATE public.orders
    SET payment_status = 'paid',
        payment_method = 'online'
    WHERE session_id = v_session_id
      AND COALESCE(status, '') NOT IN ('cancelled', 'pending')
      AND COALESCE(payment_status, 'unpaid') NOT IN ('paid', 'refunded');

    -- Onay bekleyen sipariş varsa hesap açık kalır.
    IF NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE session_id = v_session_id
        AND status = 'pending'
        AND COALESCE(payment_status, 'unpaid') NOT IN ('paid', 'refunded')
    ) THEN
      UPDATE public.dining_sessions
      SET status = 'closed',
          closed_at = now()
      WHERE id = v_session_id
        AND status = 'open';

      v_closed := true;
    END IF;
  END IF;

  RETURN jsonb_build_object('closed', v_closed);
END;
$$;
