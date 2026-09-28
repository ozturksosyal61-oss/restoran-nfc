-- OZT DIGITAL MENU
-- Masa kodu (public_token) ile çalışan güvenli müşteri fonksiyonları
--
-- Bu dosya YALNIZCA yeni fonksiyon ekler; mevcut sistemi bozmaz.
-- Kod yayına alınmadan ÖNCE çalıştırılmalıdır (yeni kod bu fonksiyonları çağırır).
-- Eski erişimleri kapatan kilit adımı 20260928_secure_plan_and_subscriptions.sql
-- dosyasındadır ve kod yayına alındıktan SONRA çalıştırılır.

-- ---------------------------------------------------------------
-- 1) Masa doğrulama: yalnızca doğru kodu bilen o masanın bilgisini alır.
--    Masa tablosu artık herkese açık okunmayacağı için müşteri
--    sayfaları masayı bu fonksiyonla doğrular.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_table(
  p_restaurant_id bigint,
  p_public_token text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', rt.id,
    'table_number', rt.table_number,
    'public_token', rt.public_token::text,
    'is_active', rt.is_active
  )
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.public_token::text = p_public_token
    AND rt.is_active = true
  LIMIT 1;
$$;

-- ---------------------------------------------------------------
-- 2) Garson / hesap talebi: masa kodu zorunlu.
-- ---------------------------------------------------------------

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
BEGIN
  SELECT rt.id
  INTO v_table_id
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.public_token::text = p_public_token
    AND rt.is_active = true;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulaması başarısız.';
  END IF;

  RETURN public.create_public_service_request(
    p_restaurant_id,
    v_table_id,
    p_request_type
  );
END;
$$;

-- ---------------------------------------------------------------
-- 3) Sipariş: masa kodu zorunlu; ürün adı, fiyat ve toplam
--    TARAYICIDAN DEĞİL ürün tablosundan alınır.
--    p_items: [{ "product_id": 1, "quantity": 2 }, ...]
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
  SELECT
    count(*),
    jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'product_name', p.name,
        'price', p.price,
        'quantity', (e.value->>'quantity')::integer
      )
      ORDER BY e.ord
    ),
    COALESCE(sum(p.price * (e.value->>'quantity')::integer), 0)
  INTO v_valid_count, v_items, v_total
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(value, ord)
  JOIN public.products p
    ON p.id = (e.value->>'product_id')::bigint
  JOIN public.categories c
    ON c.id = p.category_id
   AND c.restaurant_id = p_restaurant_id
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

GRANT EXECUTE ON FUNCTION public.get_public_table(bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_table_service_request(bigint, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_table_order(bigint, text, text, text, text, jsonb) TO anon, authenticated;
