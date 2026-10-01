-- OZT DIGITAL MENU
-- Online ödeme (2. ve 3. adım): masadan kartla ödeme, hesap bölüşme, bahşiş
--
-- 20261006_online_payments.sql çalıştırılmış olmalıdır.
--
-- Müşteri üç şekilde öder:
--   full  : kalan hesabın tamamı
--   items : kendi ürünleri (bir ürünün tamamı ya da paylaşılan kısmı)
--   equal : hesabı N kişiye eşit böler, kendi payını (ya da birkaç payı) öder
-- Ödeme başlarken ürünler / paylar 20 dakika için ayrılır; aynı ürünü iki
-- kişi ödeyemez. Ödeme başarısız olursa ya da süre dolarsa ayrılan kısım
-- kendiliğinden serbest kalır. Hesabın tamamı ödenince siparişler
-- "ödendi (online)" işaretlenir ve masa hesabı kapanır.
--
-- Fonksiyonlar yalnızca sunucu (service role) tarafından çağrılır; masa
-- kodu her çağrıda yeniden doğrulanır.

-- ---------------------------------------------------------------
-- 1) Yeni sütunlar
-- ---------------------------------------------------------------

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS session_id bigint,
  ADD COLUMN IF NOT EXISTS table_id bigint,
  ADD COLUMN IF NOT EXISTS split_mode text,
  ADD COLUMN IF NOT EXISTS split_of integer,
  ADD COLUMN IF NOT EXISTS split_parts integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.payment_transactions
    ADD CONSTRAINT payment_transactions_split_mode_check
    CHECK (split_mode IS NULL OR split_mode IN ('full', 'items', 'equal'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS payment_transactions_session_idx
  ON public.payment_transactions (session_id)
  WHERE session_id IS NOT NULL;

-- Eşit bölüşme masa hesabında tutulur; masadaki herkes aynı bölüşmeyi görür.
ALTER TABLE public.dining_sessions
  ADD COLUMN IF NOT EXISTS split_of integer,
  ADD COLUMN IF NOT EXISTS split_total numeric(12, 2),
  ADD COLUMN IF NOT EXISTS split_base numeric(12, 2),
  ADD COLUMN IF NOT EXISTS split_set_at timestamptz;

-- ---------------------------------------------------------------
-- 2) Hangi ödeme hangi ürünün ne kadarını kapsıyor
--    units: ürün adedi cinsinden; paylaşılan üründe kesirli (ör. 0.3333)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  transaction_id uuid NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  order_item_id bigint NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  units numeric(10, 4) NOT NULL CHECK (units > 0),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (transaction_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS payment_allocations_item_idx
  ON public.payment_allocations (order_item_id);

ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_allocations FROM anon, authenticated;

-- ---------------------------------------------------------------
-- 3) Masa hesabının ödeme durumu
-- ---------------------------------------------------------------

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
BEGIN
  -- Ödenmemiş (garsona ödenenler hariç) ve iptal edilmemiş siparişler.
  SELECT COALESCE(sum(COALESCE(o.total_amount, 0)), 0)
  INTO v_open_total
  FROM public.orders o
  WHERE o.session_id = p_session_id
    AND COALESCE(o.status, '') <> 'cancelled'
    AND COALESCE(o.payment_status, 'unpaid') NOT IN ('paid', 'refunded');

  -- Online ödenen ve şu an ödenmekte olan tutar (bahşiş hariç).
  SELECT
    COALESCE(sum(t.amount - t.tip_amount) FILTER (WHERE t.status = 'success'), 0),
    COALESCE(sum(t.amount - t.tip_amount) FILTER (WHERE t.status = 'pending' AND t.expires_at > now()), 0)
  INTO v_paid, v_pending
  FROM public.payment_transactions t
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
      AND COALESCE(o.status, '') <> 'cancelled'
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
    JOIN public.payment_transactions t ON t.id = a.transaction_id
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
    FROM public.payment_transactions t
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
    'split', v_split
  );
END;
$$;

-- Masa kodu ile açık hesabı bulur ve durumunu döndürür.
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

-- ---------------------------------------------------------------
-- 4) Ödemeyi başlatırken tutarı hesapla ve ürünleri / payları ayır
-- ---------------------------------------------------------------

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
    FROM public.payment_transactions
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

  INSERT INTO public.payment_transactions (
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

-- ---------------------------------------------------------------
-- 5) Başarılı ödemeden sonra: hesap tamamen ödendiyse kapat
-- ---------------------------------------------------------------

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
  FROM public.payment_transactions
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
      AND COALESCE(status, '') <> 'cancelled'
      AND COALESCE(payment_status, 'unpaid') NOT IN ('paid', 'refunded');

    UPDATE public.dining_sessions
    SET status = 'closed',
        closed_at = now()
    WHERE id = v_session_id
      AND status = 'open';

    v_closed := true;
  END IF;

  RETURN jsonb_build_object('closed', v_closed);
END;
$$;

-- ---------------------------------------------------------------
-- 6) Yetkiler: yalnızca sunucu
-- ---------------------------------------------------------------

REVOKE ALL ON FUNCTION public.table_payment_snapshot(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_table_payment_state(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_table_payment(bigint, text, text, jsonb, integer, integer, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_table_payment(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.table_payment_snapshot(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_payment_state(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_table_payment(bigint, text, text, jsonb, integer, integer, numeric, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_table_payment(uuid) TO service_role;
