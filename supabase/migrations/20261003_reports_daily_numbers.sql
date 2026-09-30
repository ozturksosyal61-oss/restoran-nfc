-- OZT DIGITAL MENU
-- Günlük sipariş numarası + satış raporları + menü istatistikleri
--
-- İŞ GÜNÜ: Gün İstanbul saatiyle 05:00'te başlar. Gece yarısını geçen
-- siparişler aynı güne sayılır (ör. 00:40'taki sipariş önceki günün
-- numarasını sürdürür, raporda da önceki güne yazılır).
--
-- Kod bu dosya çalışmadan da açılır (numara yerine eski sipariş no
-- görünür, rapor sayfaları "güncelleme bekleniyor" der).

-- ---------------------------------------------------------------
-- 0) İş günü başlangıcı
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.business_day_start(p_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (
    (((p_at AT TIME ZONE 'Europe/Istanbul') - interval '5 hours')::date)::timestamp
    + interval '5 hours'
  ) AT TIME ZONE 'Europe/Istanbul';
$$;

CREATE OR REPLACE FUNCTION public.business_day(p_at timestamptz)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT ((p_at AT TIME ZONE 'Europe/Istanbul') - interval '5 hours')::date;
$$;

-- ---------------------------------------------------------------
-- 1) Günlük sipariş numarası
--    Her restoranda iş günü başında 1'den başlar. Aynı anda gelen
--    siparişler aynı numarayı almasın diye restoran bazında kilitlenir.
-- ---------------------------------------------------------------

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS daily_number integer;

CREATE INDEX IF NOT EXISTS orders_restaurant_created_idx
ON public.orders (restaurant_id, created_at);

CREATE OR REPLACE FUNCTION public.assign_order_daily_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  v_start := public.business_day_start(COALESCE(NEW.created_at, now()));

  PERFORM pg_advisory_xact_lock(hashtext('orders_daily_number'), NEW.restaurant_id::integer);

  SELECT COALESCE(max(o.daily_number), 0) + 1
  INTO NEW.daily_number
  FROM public.orders o
  WHERE o.restaurant_id = NEW.restaurant_id
    AND o.created_at >= v_start
    AND o.created_at < v_start + interval '1 day';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_order_daily_number ON public.orders;

CREATE TRIGGER assign_order_daily_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.assign_order_daily_number();

-- Mevcut siparişlere de numara verilir.
UPDATE public.orders o
SET daily_number = numbered.rn
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY restaurant_id, public.business_day(created_at)
      ORDER BY created_at, id
    ) AS rn
  FROM public.orders
) AS numbered
WHERE o.id = numbered.id
  AND o.daily_number IS NULL;

-- Müşteri ekranları numarayı bu iki fonksiyondan okur. Tanımlar aynı,
-- yalnızca 'daily_number' alanı eklendi.

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
  WHERE o.id = p_order_id
    AND rt.public_token = p_table_token::uuid
    AND rt.is_active = true
  LIMIT 1;
$function$;

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

-- ---------------------------------------------------------------
-- 2) Yetki yardımcısı: kullanıcı bu restoranın yöneticisi ya da
--    sistem yöneticisi mi?
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_view_restaurant_reports(p_restaurant_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE ru.restaurant_id = p_restaurant_id AND ru.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_restaurant_reports(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_restaurant_reports(bigint) TO authenticated;

-- ---------------------------------------------------------------
-- 3) Satış raporu
--    Ciroya iptal edilen ve iade edilen siparişler dahil edilmez.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_restaurant_id bigint,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.can_view_restaurant_reports(p_restaurant_id) THEN
    RAISE EXCEPTION 'Bu restoran için yetkiniz yok.' USING ERRCODE = '42501';
  END IF;

  IF p_to <= p_from OR p_to - p_from > interval '400 days' THEN
    RAISE EXCEPTION 'Geçersiz tarih aralığı.' USING ERRCODE = '22023';
  END IF;

  WITH period_orders AS (
    SELECT
      o.id,
      o.total_amount,
      o.status,
      COALESCE(o.payment_status, 'unpaid') AS payment_status,
      COALESCE(NULLIF(o.payment_method, ''), 'cash') AS payment_method,
      o.table_number,
      o.created_at,
      public.business_day(o.created_at) AS day,
      extract(hour FROM o.created_at AT TIME ZONE 'Europe/Istanbul')::int AS hour,
      extract(isodow FROM public.business_day(o.created_at))::int AS weekday,
      (o.status IS DISTINCT FROM 'cancelled'
        AND COALESCE(o.payment_status, 'unpaid') <> 'refunded') AS counted
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND o.created_at >= p_from
      AND o.created_at < p_to
  ),
  valid AS (
    SELECT * FROM period_orders WHERE counted
  ),
  items AS (
    SELECT
      oi.product_id,
      oi.product_name,
      COALESCE(oi.quantity, 0) AS quantity,
      COALESCE(oi.price, 0) * COALESCE(oi.quantity, 0) AS line_total
    FROM public.order_items oi
    JOIN valid v ON v.id = oi.order_id
  ),
  sessions AS (
    SELECT
      ds.id,
      ds.opened_at,
      ds.closed_at,
      (
        SELECT COALESCE(sum(o.total_amount), 0)
        FROM public.orders o
        WHERE o.session_id = ds.id
          AND o.status IS DISTINCT FROM 'cancelled'
          AND COALESCE(o.payment_status, 'unpaid') <> 'refunded'
      ) AS total
    FROM public.dining_sessions ds
    WHERE ds.restaurant_id = p_restaurant_id
      AND ds.status = 'closed'
      AND ds.closed_at >= p_from
      AND ds.closed_at < p_to
  )
  SELECT jsonb_build_object(
    'revenue', (SELECT COALESCE(sum(total_amount), 0) FROM valid),
    'orders', (SELECT count(*) FROM valid),
    'paid_total', (SELECT COALESCE(sum(total_amount), 0) FROM valid WHERE payment_status = 'paid'),
    'unpaid_total', (SELECT COALESCE(sum(total_amount), 0) FROM valid WHERE payment_status <> 'paid'),
    'refunded_total', (SELECT COALESCE(sum(total_amount), 0) FROM period_orders WHERE payment_status = 'refunded'),
    'refunded_count', (SELECT count(*) FROM period_orders WHERE payment_status = 'refunded'),
    'cancelled_count', (SELECT count(*) FROM period_orders WHERE status = 'cancelled'),
    'items_sold', (SELECT COALESCE(sum(quantity), 0) FROM items),
    'sessions', (SELECT count(*) FROM sessions),
    'session_total', (SELECT COALESCE(sum(total), 0) FROM sessions),
    'session_minutes', (
      SELECT COALESCE(round(avg(extract(epoch FROM closed_at - opened_at) / 60)), 0)
      FROM sessions WHERE opened_at IS NOT NULL
    ),
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day', day, 'revenue', revenue, 'orders', orders, 'paid', paid
      ) ORDER BY day)
      FROM (
        SELECT day, sum(total_amount) AS revenue, count(*) AS orders,
               sum(total_amount) FILTER (WHERE payment_status = 'paid') AS paid
        FROM valid GROUP BY day
      ) d
    ), '[]'::jsonb),
    'by_hour', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hour', hour, 'revenue', revenue, 'orders', orders) ORDER BY hour)
      FROM (SELECT hour, sum(total_amount) AS revenue, count(*) AS orders FROM valid GROUP BY hour) h
    ), '[]'::jsonb),
    'by_weekday', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('weekday', weekday, 'revenue', revenue, 'orders', orders) ORDER BY weekday)
      FROM (SELECT weekday, sum(total_amount) AS revenue, count(*) AS orders FROM valid GROUP BY weekday) w
    ), '[]'::jsonb),
    'by_payment', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('method', payment_method, 'revenue', revenue, 'orders', orders) ORDER BY revenue DESC)
      FROM (
        SELECT payment_method, sum(total_amount) AS revenue, count(*) AS orders
        FROM valid WHERE payment_status = 'paid' GROUP BY payment_method
      ) p
    ), '[]'::jsonb),
    'top_products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'revenue', revenue) ORDER BY quantity DESC, revenue DESC)
      FROM (
        SELECT COALESCE(max(product_name), 'Ürün') AS name, sum(quantity) AS quantity, sum(line_total) AS revenue
        FROM items
        GROUP BY COALESCE(product_id::text, product_name)
        ORDER BY sum(quantity) DESC, sum(line_total) DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb),
    'by_category', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'revenue', revenue) ORDER BY revenue DESC)
      FROM (
        SELECT COALESCE(c.name, 'Silinmiş ürünler') AS name, sum(i.quantity) AS quantity, sum(i.line_total) AS revenue
        FROM items i
        LEFT JOIN public.products p ON p.id = i.product_id
        LEFT JOIN public.categories c ON c.id = p.category_id
        GROUP BY COALESCE(c.name, 'Silinmiş ürünler')
      ) c
    ), '[]'::jsonb),
    'by_table', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('table', table_number, 'revenue', revenue, 'orders', orders) ORDER BY revenue DESC)
      FROM (
        SELECT table_number::text AS table_number, sum(total_amount) AS revenue, count(*) AS orders
        FROM valid WHERE table_number IS NOT NULL
        GROUP BY table_number::text
        ORDER BY sum(total_amount) DESC
        LIMIT 15
      ) t
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_report(bigint, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_report(bigint, timestamptz, timestamptz) TO authenticated;

-- ---------------------------------------------------------------
-- 4) Menü istatistikleri
--    Menü açılışı ve ürün incelemesi kaydedilir. Ziyaretçi, tarayıcıda
--    üretilen rastgele bir kimlikle sayılır; kişisel veri tutulmaz.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.menu_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id bigint NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('menu_view', 'product_view')),
  product_id bigint REFERENCES public.products(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'tr' CHECK (char_length(language) <= 5),
  visitor text CHECK (char_length(visitor) <= 64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_events_restaurant_created_idx
ON public.menu_events (restaurant_id, created_at);

CREATE INDEX IF NOT EXISTS menu_events_dedupe_idx
ON public.menu_events (restaurant_id, visitor, event, created_at);

ALTER TABLE public.menu_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant members read menu events" ON public.menu_events;
CREATE POLICY "Restaurant members read menu events"
ON public.menu_events
FOR SELECT
TO authenticated
USING (public.can_view_restaurant_reports(restaurant_id));

-- Tabloya doğrudan yazılamaz; yalnızca log_menu_event ile.
REVOKE INSERT, UPDATE, DELETE ON public.menu_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_menu_event(
  p_restaurant_id bigint,
  p_event text,
  p_product_id bigint DEFAULT NULL,
  p_language text DEFAULT 'tr',
  p_visitor text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor text := NULLIF(left(btrim(COALESCE(p_visitor, '')), 64), '');
  v_language text := left(COALESCE(NULLIF(btrim(p_language), ''), 'tr'), 5);
BEGIN
  IF p_event NOT IN ('menu_view', 'product_view') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id AND is_active = true) THEN
    RETURN;
  END IF;

  IF p_event = 'product_view' THEN
    IF p_product_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.categories c ON c.id = p.category_id
      WHERE p.id = p_product_id AND c.restaurant_id = p_restaurant_id
    ) THEN
      RETURN;
    END IF;
  ELSE
    p_product_id := NULL;
  END IF;

  -- Aynı ziyaretçinin 30 dakika içindeki tekrarı sayılmaz.
  IF v_visitor IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.menu_events e
    WHERE e.restaurant_id = p_restaurant_id
      AND e.visitor = v_visitor
      AND e.event = p_event
      AND e.product_id IS NOT DISTINCT FROM p_product_id
      AND e.created_at > now() - interval '30 minutes'
  ) THEN
    RETURN;
  END IF;

  -- Kötüye kullanıma karşı üst sınır: restoran başına 10 dakikada 3000 kayıt.
  IF (
    SELECT count(*) FROM public.menu_events e
    WHERE e.restaurant_id = p_restaurant_id
      AND e.created_at > now() - interval '10 minutes'
  ) >= 3000 THEN
    RETURN;
  END IF;

  INSERT INTO public.menu_events (restaurant_id, event, product_id, language, visitor)
  VALUES (p_restaurant_id, p_event, p_product_id, v_language, v_visitor);
END;
$$;

REVOKE ALL ON FUNCTION public.log_menu_event(bigint, text, bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_menu_event(bigint, text, bigint, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_menu_stats(
  p_restaurant_id bigint,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.can_view_restaurant_reports(p_restaurant_id) THEN
    RAISE EXCEPTION 'Bu restoran için yetkiniz yok.' USING ERRCODE = '42501';
  END IF;

  IF p_to <= p_from OR p_to - p_from > interval '400 days' THEN
    RAISE EXCEPTION 'Geçersiz tarih aralığı.' USING ERRCODE = '22023';
  END IF;

  WITH events AS (
    SELECT
      e.event,
      e.product_id,
      e.language,
      e.visitor,
      public.business_day(e.created_at) AS day,
      extract(hour FROM e.created_at AT TIME ZONE 'Europe/Istanbul')::int AS hour
    FROM public.menu_events e
    WHERE e.restaurant_id = p_restaurant_id
      AND e.created_at >= p_from
      AND e.created_at < p_to
  ),
  views AS (
    SELECT * FROM events WHERE event = 'menu_view'
  ),
  product_views AS (
    SELECT product_id, count(*) AS views
    FROM events
    WHERE event = 'product_view' AND product_id IS NOT NULL
    GROUP BY product_id
  ),
  menu_products AS (
    SELECT p.id, p.name, c.name AS category
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    WHERE c.restaurant_id = p_restaurant_id
      AND p.is_available IS DISTINCT FROM false
  )
  SELECT jsonb_build_object(
    'menu_views', (SELECT count(*) FROM views),
    'visitors', (SELECT count(DISTINCT visitor) FROM views WHERE visitor IS NOT NULL),
    'product_views', (SELECT COALESCE(sum(views), 0) FROM product_views),
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'views', views, 'visitors', visitors) ORDER BY day)
      FROM (
        SELECT day, count(*) AS views, count(DISTINCT visitor) AS visitors
        FROM views GROUP BY day
      ) d
    ), '[]'::jsonb),
    'by_hour', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hour', hour, 'views', views) ORDER BY hour)
      FROM (SELECT hour, count(*) AS views FROM views GROUP BY hour) h
    ), '[]'::jsonb),
    'by_language', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('language', language, 'views', views) ORDER BY views DESC)
      FROM (SELECT language, count(*) AS views FROM views GROUP BY language) l
    ), '[]'::jsonb),
    'top_products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', mp.name, 'category', mp.category, 'views', pv.views) ORDER BY pv.views DESC)
      FROM (
        SELECT pv.*
        FROM product_views pv
        JOIN menu_products mp ON mp.id = pv.product_id
        ORDER BY pv.views DESC
        LIMIT 20
      ) pv
      JOIN menu_products mp ON mp.id = pv.product_id
    ), '[]'::jsonb),
    'unseen_products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', mp.name, 'category', mp.category) ORDER BY mp.category, mp.name)
      FROM (
        SELECT mp.* FROM menu_products mp
        WHERE NOT EXISTS (SELECT 1 FROM product_views pv WHERE pv.product_id = mp.id)
        ORDER BY mp.category, mp.name
        LIMIT 30
      ) mp
    ), '[]'::jsonb),
    'unseen_count', (
      SELECT count(*) FROM menu_products mp
      WHERE NOT EXISTS (SELECT 1 FROM product_views pv WHERE pv.product_id = mp.id)
    ),
    'first_event', (
      SELECT min(created_at) FROM public.menu_events WHERE restaurant_id = p_restaurant_id
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_menu_stats(bigint, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_menu_stats(bigint, timestamptz, timestamptz) TO authenticated;
