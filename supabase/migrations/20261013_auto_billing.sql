-- OZT DIGITAL MENU
-- Abonelik ücretinin otomatik tahsili (iyzico Abonelik)
--
-- Restoranlar iki şekilde yönetilir:
--   * Elle (varsayılan): billing_accounts satırı yoktur; sistem yöneticisi
--     aboneliği eskisi gibi sistem panelinden yönetir. Hiçbir şey kapanmaz.
--   * Otomatik: sistem yöneticisi restoran için otomatik ödemeyi açar.
--     Restoran 7 gün deneme ile başlar; işletme sahibi kartını panelden
--     ekler ve iyzico her dönem otomatik çeker. Ödeme alınamazsa 7 gün ek
--     süre verilir; süre dolunca yönetim paneli ve müşteri menüsü kapanır.
--
-- Kart bilgisi iyzico'da saklanır; bu veritabanında yalnızca iyzico'nun
-- referans kodları tutulur. İki tabloya da politika yoktur: yalnızca
-- sunucu (service role) okur ve yazar.

-- ---------------------------------------------------------------
-- 1) Platformun iyzico hesabı (tek satır)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  -- AES-256-GCM ile şifreli JSON: apiKey, secretKey, merchantId
  credentials text,
  credentials_hint jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- iyzico abonelik ürünü ve paketlere karşılık gelen ödeme planları:
  -- { "<paket id>": { "monthly": { "ref": "...", "price": 499 }, "yearly": {...} } }
  product_ref text,
  plan_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  trial_days integer NOT NULL DEFAULT 7 CHECK (trial_days BETWEEN 0 AND 90),
  grace_days integer NOT NULL DEFAULT 7 CHECK (grace_days BETWEEN 0 AND 60),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.billing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_settings FROM anon, authenticated;

-- ---------------------------------------------------------------
-- 2) Restoranın otomatik abonelik hesabı
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_accounts (
  restaurant_id bigint PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  trial_ends_at timestamptz,
  -- Ödenmiş dönemin sonu (iyzico'dan eşitlenir).
  paid_until timestamptz,
  past_due_since timestamptz,
  cancelled_at timestamptz,
  -- Fatura bilgileri (iyzico abonelik formu için zorunlu)
  billing_name text,
  billing_surname text,
  billing_email text,
  billing_phone text,
  billing_identity text,
  billing_city text,
  billing_address text,
  -- iyzico referansları
  iyzico_customer_ref text,
  iyzico_subscription_ref text UNIQUE,
  last_order_ref text,
  pending_token text,
  pending_plan_id text,
  pending_interval text,
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_accounts FROM anon, authenticated;

-- ---------------------------------------------------------------
-- 3) Restoran hizmette mi?
--    'open'    : her şey açık
--    'grace'   : ödeme alınamadı / deneme bitti; ek süre içinde, açık
--    'blocked' : ek süre doldu; panel (abonelik sayfası hariç) ve müşteri
--                menüsü kapalı
--    Satırı olmayan (elle yönetilen) restoran her zaman 'open'dır.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_access(p_restaurant_id bigint)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.billing_accounts%ROWTYPE;
  v_grace interval;
  v_base timestamptz;
BEGIN
  SELECT * INTO b FROM public.billing_accounts WHERE restaurant_id = p_restaurant_id;
  IF NOT FOUND THEN
    RETURN 'open';
  END IF;

  SELECT make_interval(days => grace_days) INTO v_grace FROM public.billing_settings WHERE id = 1;
  v_grace := COALESCE(v_grace, interval '7 days');

  IF b.status = 'suspended' THEN
    RETURN 'blocked';
  END IF;

  IF b.status = 'trial' THEN
    IF b.trial_ends_at IS NULL OR now() < b.trial_ends_at THEN RETURN 'open'; END IF;
    IF now() < b.trial_ends_at + v_grace THEN RETURN 'grace'; END IF;
    RETURN 'blocked';
  END IF;

  IF b.status = 'cancelled' THEN
    IF b.paid_until IS NOT NULL AND now() < b.paid_until THEN RETURN 'open'; END IF;
    RETURN 'blocked';
  END IF;

  -- active / past_due
  IF b.status = 'active' AND b.paid_until IS NOT NULL AND now() < b.paid_until THEN
    RETURN 'open';
  END IF;

  v_base := GREATEST(
    COALESCE(b.paid_until, '-infinity'::timestamptz),
    COALESCE(b.past_due_since, '-infinity'::timestamptz),
    COALESCE(b.trial_ends_at, '-infinity'::timestamptz)
  );
  IF v_base = '-infinity'::timestamptz THEN v_base := b.updated_at; END IF;

  IF now() < v_base + v_grace THEN RETURN 'grace'; END IF;
  RETURN 'blocked';
END;
$$;

REVOKE ALL ON FUNCTION public.billing_access(bigint) FROM PUBLIC;
-- Müşteri sayfası (oturumsuz) menünün açık olup olmadığını sorabilir;
-- fonksiyon yalnızca durumu döndürür, ödeme bilgisi döndürmez.
GRANT EXECUTE ON FUNCTION public.billing_access(bigint) TO anon, authenticated, service_role;
