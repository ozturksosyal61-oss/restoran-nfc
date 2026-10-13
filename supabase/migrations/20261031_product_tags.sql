-- OZT DIGITAL MENU
-- Ürün etiketleri
--
--   * products.tags: kalıcı etiketler.
--       Öne çıkarma: new (Yeni), chef (Şefin önerisi), homemade (Ev yapımı),
--                    sharing (Paylaşımlık)
--       Bilgi / diyet: spicy_1..spicy_3 (acılık), vegetarian, vegan,
--                      gluten_free, lactose_free, alcohol
--   * products.new_until: "Yeni" etiketinin kendiliğinden kalktığı gün
--     (boşsa etiket elle kaldırılana kadar kalır).
--   * public_menu_best_sellers: son 30 günün satışlarına göre her
--     kategorinin en çok satan ürünleri ("Çok satan" rozeti, Pro paketi).
--
-- Kod bu dosya çalıştırılmadan da çalışır; etiketler görünmez.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS new_until date;

-- Yalnızca bilinen etiketler kaydedilebilir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_tags_known') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_tags_known CHECK (
        tags <@ ARRAY[
          'new', 'chef', 'homemade', 'sharing',
          'spicy_1', 'spicy_2', 'spicy_3',
          'vegetarian', 'vegan', 'gluten_free', 'lactose_free', 'alcohol'
        ]::text[]
      );
  END IF;
END;
$$;

-- Her kategorinin en çok satan (en fazla) 2 ürünü; son 30 gün, iptal ve
-- iade edilenler hariç, en az 5 adet satılmış olmalı.
CREATE OR REPLACE FUNCTION public.public_menu_best_sellers(p_restaurant_id bigint)
RETURNS SETOF bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH sold AS (
    SELECT oi.product_id, p.category_id, SUM(COALESCE(oi.quantity, 0)) AS quantity
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.categories c ON c.id = p.category_id AND c.restaurant_id = p_restaurant_id
    WHERE o.restaurant_id = p_restaurant_id
      AND o.created_at >= now() - interval '30 days'
      AND COALESCE(o.status, '') <> 'cancelled'
      AND COALESCE(o.payment_status, '') <> 'refunded'
    GROUP BY oi.product_id, p.category_id
    HAVING SUM(COALESCE(oi.quantity, 0)) >= 5
  ),
  ranked AS (
    SELECT product_id,
           row_number() OVER (PARTITION BY category_id ORDER BY quantity DESC, product_id) AS rank
    FROM sold
  )
  SELECT product_id::bigint FROM ranked WHERE rank <= 2;
$$;

GRANT EXECUTE ON FUNCTION public.public_menu_best_sellers(bigint) TO anon, authenticated;
