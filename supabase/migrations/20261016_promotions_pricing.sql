-- OZT DIGITAL MENU
-- Kampanyalar menüde ve siparişte geçerli olur
--
-- 1) promotions.badge: menüde ürünün üstünde görünen kısa etiket
--    (ör. "Hafta sonu", "Şefin önerisi"). Boşsa indirim oranı gösterilir.
-- 2) promotion_price / product_sale_price: kampanyalı birim fiyat.
--    Aktif kampanya: is_active, başlangıcı gelmiş, bitişi geçmemiş.
--    Ürüne ya da ürünün kategorisine tanımlı kampanyalardan müşteriye
--    EN UCUZ fiyatı veren uygulanır.
-- 3) public_menu_promotions: menünün kampanyalı ürünleri (herkese açık,
--    yalnızca menüde gösterilecek alanlar).
-- 4) create_table_order: sipariş tutarı kampanyalı fiyatla hesaplanır.
--    Menüde indirimli görünen fiyat siparişte de aynen alınır.

ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS badge text;

ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_badge_length;
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_badge_length CHECK (badge IS NULL OR char_length(badge) <= 24);

-- ---------------------------------------------------------------
-- Kampanyalı fiyat (tek kampanya için)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promotion_price(p_type text, p_value numeric, p_price numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_type = 'percentage'
      THEN round(p_price * (1 - LEAST(GREATEST(COALESCE(p_value, 0), 0), 100) / 100.0), 2)
    WHEN p_type = 'fixed'
      THEN GREATEST(p_price - GREATEST(COALESCE(p_value, 0), 0), 0)
    ELSE p_price
  END;
$$;

-- ---------------------------------------------------------------
-- Ürünün şu anki satış fiyatı (aktif kampanyaların en ucuzu)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.product_sale_price(
  p_restaurant_id bigint,
  p_product_id bigint,
  p_category_id bigint,
  p_price numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT LEAST(
    p_price,
    COALESCE(min(public.promotion_price(pr.discount_type::text, pr.discount_value, p_price)), p_price)
  )
  FROM public.promotions pr
  WHERE pr.restaurant_id = p_restaurant_id
    AND pr.is_active = true
    AND (pr.start_at IS NULL OR pr.start_at <= now())
    AND (pr.end_at IS NULL OR pr.end_at > now())
    AND (
      pr.product_id = p_product_id
      OR (pr.product_id IS NULL AND pr.category_id = p_category_id)
    );
$$;

REVOKE ALL ON FUNCTION public.product_sale_price(bigint, bigint, bigint, numeric) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- Menüdeki kampanyalı ürünler (müşteri menüsü okur)
-- ---------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_menu_promotions(bigint);

CREATE FUNCTION public.public_menu_promotions(p_restaurant_id bigint)
RETURNS TABLE (
  product_id bigint,
  sale_price numeric,
  title text,
  description text,
  badge text,
  discount_type text,
  discount_value numeric,
  end_at timestamptz,
  is_popular boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    best.sale_price,
    best.title,
    best.description,
    best.badge,
    best.discount_type,
    best.discount_value,
    best.end_at,
    best.is_popular
  FROM public.products p
  JOIN public.categories c
    ON c.id = p.category_id
   AND c.restaurant_id = p_restaurant_id
  CROSS JOIN LATERAL (
    SELECT
      public.promotion_price(pr.discount_type::text, pr.discount_value, p.price) AS sale_price,
      pr.title::text AS title,
      pr.description::text AS description,
      pr.badge::text AS badge,
      pr.discount_type::text AS discount_type,
      pr.discount_value AS discount_value,
      pr.end_at AS end_at,
      COALESCE(pr.is_popular, false) AS is_popular
    FROM public.promotions pr
    WHERE pr.restaurant_id = p_restaurant_id
      AND pr.is_active = true
      AND (pr.start_at IS NULL OR pr.start_at <= now())
      AND (pr.end_at IS NULL OR pr.end_at > now())
      AND (
        pr.product_id = p.id
        OR (pr.product_id IS NULL AND pr.category_id = c.id)
      )
    ORDER BY 1 ASC, (pr.product_id IS NOT NULL) DESC, pr.id DESC
    LIMIT 1
  ) best
  WHERE public.is_active_restaurant(p_restaurant_id)
    AND p.is_available IS DISTINCT FROM false
    AND best.sale_price < p.price;
$$;

REVOKE ALL ON FUNCTION public.public_menu_promotions(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_menu_promotions(bigint) TO anon, authenticated;

-- ---------------------------------------------------------------
-- Sipariş: birim fiyat kampanyalı fiyattır
-- (20260928_table_token_rpcs.sql tanımıyla aynı; yalnızca fiyat değişti)
-- ---------------------------------------------------------------

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
BEGIN
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

  RETURN public.create_public_order_with_session(
    p_restaurant_id,
    v_table_id,
    v_table_number,
    NULLIF(left(trim(COALESCE(p_customer_name, '')), 80), ''),
    NULLIF(left(trim(COALESCE(p_note, '')), 500), ''),
    v_total,
    COALESCE(NULLIF(p_payment_method, ''), 'cash'),
    v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_table_order(bigint, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_table_order(bigint, text, text, text, text, jsonb) TO anon, authenticated;
