-- OZT DIGITAL MENU
-- Çok dilli menü + müşteri geri bildirimi
--
-- Kod bu dosya çalışmadan da açılır (menü Türkçe kalır, geri bildirim
-- sayfası "henüz hazır değil" der). Dosya kod yayına alınmadan önce ya da
-- sonra çalıştırılabilir.

-- ---------------------------------------------------------------
-- 1) Çok dilli menü
--    translations: {"en": {"name": "...", "description": "...",
--                          "ingredients": "...", "allergens": "...",
--                          "src": "<Türkçe metnin parmak izi>"}, ...}
--    src, çeviri yapıldığı andaki Türkçe metni gösterir; ürün sonradan
--    değişirse eski çeviri gösterilmez, Türkçesi gösterilir.
-- ---------------------------------------------------------------

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS menu_languages text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.restaurants
DROP CONSTRAINT IF EXISTS restaurants_menu_languages_check;

ALTER TABLE public.restaurants
ADD CONSTRAINT restaurants_menu_languages_check
CHECK (menu_languages <@ ARRAY['en', 'de', 'ru', 'ar', 'fr']::text[]);

-- ---------------------------------------------------------------
-- 2) Müşteri geri bildirimi
--    Müşteri deneyimini 1-5 yıldızla puanlar. 4-5 verenler Google
--    yorumuna davet edilir; herkes işletmeye özel not bırakabilir.
--    Kayıtlar yalnızca restoranın kendisine ve sistem yöneticisine açıktır.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id bigint NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 1000),
  contact text CHECK (char_length(contact) <= 120),
  went_to_google boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_feedback_restaurant_created_idx
ON public.customer_feedback (restaurant_id, created_at DESC);

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant members read feedback" ON public.customer_feedback;
CREATE POLICY "Restaurant members read feedback"
ON public.customer_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.restaurant_id = customer_feedback.restaurant_id
      AND ru.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Restaurant members update feedback" ON public.customer_feedback;
CREATE POLICY "Restaurant members update feedback"
ON public.customer_feedback
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.restaurant_id = customer_feedback.restaurant_id
      AND ru.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Restaurant members delete feedback" ON public.customer_feedback;
CREATE POLICY "Restaurant members delete feedback"
ON public.customer_feedback
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.restaurant_id = customer_feedback.restaurant_id
      AND ru.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
);

-- Yönetici yalnızca "çözüldü" işaretini değiştirebilir; müşterinin
-- yazdığı puan ve metin değiştirilemez.
REVOKE UPDATE ON public.customer_feedback FROM authenticated;
GRANT UPDATE (is_resolved) ON public.customer_feedback TO authenticated;

-- Tabloya doğrudan ekleme yok; müşteri yalnızca bu fonksiyonla yazar.
REVOKE INSERT ON public.customer_feedback FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_customer_feedback(
  p_slug text,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_contact text DEFAULT NULL,
  p_went_to_google boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id bigint;
  v_recent integer;
  v_id bigint;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Puan 1 ile 5 arasında olmalı.' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_restaurant_id
  FROM public.restaurants
  WHERE slug = p_slug AND is_active = true;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'İşletme bulunamadı.' USING ERRCODE = 'P0002';
  END IF;

  -- Kötüye kullanıma karşı: bir restorana 10 dakikada en fazla 30 kayıt.
  SELECT count(*) INTO v_recent
  FROM public.customer_feedback
  WHERE restaurant_id = v_restaurant_id
    AND created_at > now() - interval '10 minutes';

  IF v_recent >= 30 THEN
    RAISE EXCEPTION 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.customer_feedback (restaurant_id, rating, comment, contact, went_to_google)
  VALUES (
    v_restaurant_id,
    p_rating,
    NULLIF(left(btrim(coalesce(p_comment, '')), 1000), ''),
    NULLIF(left(btrim(coalesce(p_contact, '')), 120), ''),
    coalesce(p_went_to_google, false)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_customer_feedback(text, integer, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_customer_feedback(text, integer, text, text, boolean) TO anon, authenticated;
