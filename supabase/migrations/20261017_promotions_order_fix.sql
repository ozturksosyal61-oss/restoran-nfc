-- OZT DIGITAL MENU
-- Kampanya fiyatı siparişte de geçerli olsun (düzeltme)
--
-- 20261016 sipariş toplamını kampanyalı fiyatla gönderiyordu, ancak siparişi
-- yazan create_public_order kalem fiyatlarını ve toplamı ürün tablosundan
-- yeniden hesaplıyor. Bu yüzden sipariş oluşturulduktan sonra kalem fiyatları
-- ve sipariş toplamı kampanyalı fiyata göre düzeltilir.
-- 20261016_promotions_pricing.sql'den SONRA çalıştırın.

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

REVOKE ALL ON FUNCTION public.create_table_order(bigint, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_table_order(bigint, text, text, text, text, jsonb) TO anon, authenticated;
