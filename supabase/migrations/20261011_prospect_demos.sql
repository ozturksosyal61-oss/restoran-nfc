-- OZT DIGITAL MENU
-- Müşteriye özel demo
--
-- Sistem sahibi, satış görüşmesinden önce işletmenin menü fotoğrafından
-- o işletmeye özel bir demo restoran oluşturur. Demo belirli bir süre
-- sonra kapanır (müşteri sayfası "demo sona erdi" der); sistem panelinden
-- uzatılabilir, silinebilir ya da kalıcı restorana çevrilebilir.

-- ---------------------------------------------------------------
-- 1) Demo bitiş tarihi (boşsa normal restoran)
-- ---------------------------------------------------------------

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS demo_expires_at timestamptz;

-- ---------------------------------------------------------------
-- 2) Demo kayıtları (yalnızca sunucu okur / yazar)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_demos (
  restaurant_id bigint PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  prospect_name text NOT NULL,
  note text,
  manager_user_id uuid,
  manager_email text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_demos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prospect_demos FROM anon, authenticated;

-- ---------------------------------------------------------------
-- 3) Restoran yöneticisi demo süresini kendisi uzatamasın.
--    (20260928 sürümü baz alındı; yalnızca demo_expires_at eklendi.)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_restaurant_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role ve SQL Editor oturumsuz çalışır (auth.uid() boş).
  -- Anonim kullanıcıların UPDATE izni RLS'te zaten yok.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.demo_expires_at IS DISTINCT FROM OLD.demo_expires_at THEN
    RAISE EXCEPTION 'Paket, durum, adres (slug) ve demo süresini yalnızca sistem yöneticisi değiştirebilir.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
