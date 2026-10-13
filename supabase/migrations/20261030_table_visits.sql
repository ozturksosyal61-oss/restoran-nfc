-- OZT DIGITAL MENU
-- Süreli masa oturumu (masa ziyaret kodu)
--
-- Sorun: QR / NFC'deki masa kodu sabitti ve telefonda süresiz saklanıyordu.
-- Bir kez okutan, günler sonra evden o masaya sipariş verebiliyor ya da
-- garson çağırabiliyordu; masadan kalkan müşteri, masaya yeni oturanların
-- hesabına sipariş ekleyebiliyordu.
--
-- Çözüm:
--   * QR okutulunca (get_public_table, masanın gerçek koduyla) o telefona
--     özel bir "ziyaret kodu" verilir. Menüdeki bağlantılar ve telefonda
--     saklanan kod artık bu ziyaret kodudur.
--   * Sipariş, garson / hesap çağrısı ve ödeme başlatma yalnızca geçerli
--     ziyaret koduyla yapılır:
--       - 4 saat kullanılmazsa (en fazla 16 saat) süresi dolar;
--       - masanın hesabı kapatılınca o hesaba ait ziyaretler biter.
--     Süresi dolan müşteri masadaki QR'ı yeniden okutur.
--   * Hesap, ödeme durumu ve sipariş takibi gibi yalnızca okuma yapan
--     işlemler 24 saat boyunca çalışmaya devam eder (ödeme dönüşü bozulmasın).
--
-- Kod değişikliği gerektirmez: get_public_table'ın döndürdüğü
-- "public_token" alanı artık ziyaret kodudur.

-- ---------------------------------------------------------------
-- 1) Ziyaretler
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.table_visits (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id bigint NOT NULL,
  table_id bigint NOT NULL,
  -- Ziyaretin bağlı olduğu masa hesabı; hesap kapanınca ziyaret biter.
  dining_session_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS table_visits_table_created_idx
  ON public.table_visits (table_id, created_at);

-- Yalnızca aşağıdaki fonksiyonlar erişir.
ALTER TABLE public.table_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.table_visits FROM anon, authenticated;

-- Hesap kapanınca kapanış saati her zaman yazılsın (ziyaretlerin bitişi
-- buna bakar; panelden tanımlı kapatma fonksiyonları da kapsansın).
CREATE OR REPLACE FUNCTION public.set_dining_session_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'open' AND OLD.status = 'open' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dining_sessions_closed_at ON public.dining_sessions;
CREATE TRIGGER dining_sessions_closed_at
BEFORE UPDATE OF status ON public.dining_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_dining_session_closed_at();

-- ---------------------------------------------------------------
-- 2) Ziyaret kodunu masanın gerçek koduna çevirir.
--    p_write = true  : sipariş, çağrı, ödeme (süre ve hesap kontrolü)
--    p_write = false : yalnızca okuma (24 saat; eski masa kodu da kabul)
--    Geçersizse NULL döner.
-- ---------------------------------------------------------------

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
      AND (v.dining_session_id IS NULL OR ds.id = v.dining_session_id)
  ) THEN
    RETURN NULL;
  END IF;

  IF v.dining_session_id IS NULL THEN
    SELECT ds.id
    INTO v_open
    FROM public.dining_sessions ds
    WHERE ds.restaurant_id = p_restaurant_id
      AND ds.table_id = v.table_id
      AND ds.status = 'open'
    ORDER BY ds.id DESC
    LIMIT 1;
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

REVOKE ALL ON FUNCTION public.resolve_table_visit(bigint, text, boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 3) Masa doğrulama: masanın kendi koduyla yeni ziyaret açar,
--    ziyaret koduyla geçerliliğini kontrol eder.
--    Dönen "public_token" ziyaret kodudur.
-- ---------------------------------------------------------------

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
      SELECT ds.id
      INTO v_open
      FROM public.dining_sessions ds
      WHERE ds.restaurant_id = p_restaurant_id
        AND ds.table_id = v_table_id
        AND ds.status = 'open'
      ORDER BY ds.id DESC
      LIMIT 1;

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

GRANT EXECUTE ON FUNCTION public.get_public_table(bigint, text) TO anon, authenticated;

-- ---------------------------------------------------------------
-- 4) Sipariş takibi: ziyaret kodu da kabul edilir.
--    (20261009 sürümü; yalnızca masa kodu koşulu değişti.)
-- ---------------------------------------------------------------

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
  WHERE o.id = p_order_id
    AND rt.public_token::text = public.resolve_table_visit(o.restaurant_id, p_table_token, false)
    AND rt.is_active = true
  LIMIT 1;
$function$;

-- ---------------------------------------------------------------
-- 5) Masa kodu kullanan diğer fonksiyonlar: ilk satırda ziyaret kodu
--    çevrilir; gövdeler son sürümlerle aynıdır.
-- ---------------------------------------------------------------

-- create_table_service_request: 20261027_service_request_recall.sql sürümü; yalnızca masa kodu çevirisi eklendi.
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
    IF v_open.last_call < now() - interval '60 seconds' THEN
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

-- create_table_order: 20261017_promotions_order_fix.sql sürümü; yalnızca masa kodu çevirisi eklendi.
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

-- reserve_table_payment: 20261008_online_payments_fix.sql sürümü; yalnızca masa kodu çevirisi eklendi.
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
  SELECT id
  INTO v_session_id
  FROM public.dining_sessions
  WHERE restaurant_id = p_restaurant_id
    AND table_id = v_table_id
    AND status = 'open'
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

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

-- get_public_dining_bill: 20261003_reports_daily_numbers.sql sürümü; yalnızca masa kodu çevirisi eklendi.
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

  SELECT id
  INTO v_session_id
  FROM public.dining_sessions
  WHERE restaurant_id = p_restaurant_id
    AND table_id = p_table_id
    AND status = 'open'
  ORDER BY id DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'open', false,
      'session_id', null,
      'restaurant_id', p_restaurant_id,
      'table_id', p_table_id,
      'table_number', v_table_number,
      'orders', '[]'::jsonb,
      'order_total', 0,
      'due_total', 0
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
    AND COALESCE(o.payment_status, 'unpaid') <> 'refunded';

  SELECT COALESCE(SUM(COALESCE(o.total_amount, 0)), 0)
  INTO v_order_total
  FROM public.orders o
  WHERE o.session_id = v_session_id
    AND COALESCE(o.payment_status, 'unpaid') <> 'refunded';

  SELECT COALESCE(SUM(COALESCE(o.total_amount, 0)), 0)
  INTO v_due_total
  FROM public.orders o
  WHERE o.session_id = v_session_id
    AND COALESCE(o.payment_status, 'unpaid') NOT IN ('paid', 'refunded');

  RETURN jsonb_build_object(
    'open', true,
    'session_id', v_session_id,
    'restaurant_id', p_restaurant_id,
    'table_id', p_table_id,
    'table_number', v_table_number,
    'orders', v_orders,
    'order_total', v_order_total,
    'due_total', v_due_total
  );
END;
$function$;

-- get_table_payment_state: 20261008_online_payments_fix.sql sürümü; yalnızca masa kodu çevirisi eklendi.
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

  SELECT id
  INTO v_session_id
  FROM public.dining_sessions
  WHERE restaurant_id = p_restaurant_id
    AND table_id = v_table_id
    AND status = 'open'
  ORDER BY id DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('open', false, 'table_number', v_table_number);
  END IF;

  RETURN public.table_payment_snapshot(v_session_id)
    || jsonb_build_object('open', true, 'table_number', v_table_number);
END;
$$;
