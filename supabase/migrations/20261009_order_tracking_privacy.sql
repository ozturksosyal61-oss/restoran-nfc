-- OZT DIGITAL MENU
-- Sipariş takibi gizliliği
--
-- get_public_order, masanın QR kodunu bilen herkese o masanın HER siparişini
-- (sipariş numarasını değiştirerek eski müşterilerinkini de) gösteriyordu.
-- Masa kodu QR'da sabit olduğu için masaya sonradan oturan müşteri, önceki
-- müşterinin siparişini, adını ve notunu görebilirdi.
--
-- Artık yalnızca masanın AÇIK hesabındaki siparişler görünür. Hesap
-- kapandığında (ödenip kapatıldığında) o hesabın siparişleri müşteri
-- tarafından görüntülenemez; işletme paneli etkilenmez.
-- (20261003 sürümü baz alındı; yalnızca son koşul eklendi.)

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
    AND rt.public_token = p_table_token::uuid
    AND rt.is_active = true
  LIMIT 1;
$function$;
