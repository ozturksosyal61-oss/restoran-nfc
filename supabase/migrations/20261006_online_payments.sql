-- OZT DIGITAL MENU
-- NOT: Bu dosyanın ilk sürümü "payment_transactions" adını kullanıyordu ve
-- mevcut abonelik tablosuyla çakıştı. Düzeltme: 20261008_online_payments_fix.sql
-- Online ödeme (1. adım): restoranın kendi iyzico / PayTR hesabı ve test ödemeleri
--
-- Her restoran kendi ödeme sağlayıcısının API bilgilerini panelden girer.
-- Bilgiler sunucuda AES-256-GCM ile şifrelenip saklanır; anahtar
-- (PAYMENT_ENCRYPTION_KEY) yalnızca sunucunun ortam değişkenindedir.
--
-- İki tabloya da politika yoktur: tarayıcıdan (anon / authenticated)
-- okunamaz ve yazılamaz. Yalnızca sunucu (service role), yetki
-- kontrolünden sonra erişir.

-- ---------------------------------------------------------------
-- 1) Restoranın ödeme sağlayıcısı ayarları
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_settings (
  restaurant_id bigint PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('iyzico', 'paytr')),
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  -- Müşteri menüsünde kartla ödeme açık mı (2. adımda kullanılacak).
  is_enabled boolean NOT NULL DEFAULT false,
  -- Şifreli JSON: API anahtarları. Düz metin hiçbir zaman saklanmaz.
  credentials text NOT NULL,
  -- Ekranda gösterilecek ipuçları (ör. anahtarın son 4 hanesi).
  credentials_hint jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Bu ayarlarla yapılan son başarılı test ödemesi; ayar değişince sıfırlanır.
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_settings FROM anon, authenticated;

-- ---------------------------------------------------------------
-- 2) Ödeme işlemleri (test ödemeleri; 2. adımda masa hesapları)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.online_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id bigint NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('test', 'bill')),
  provider text NOT NULL CHECK (provider IN ('iyzico', 'paytr')),
  mode text NOT NULL CHECK (mode IN ('test', 'live')),
  -- Sağlayıcıya gönderilen sipariş numarası (iyzico conversationId, PayTR merchant_oid).
  reference text NOT NULL UNIQUE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  tip_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  provider_token text,
  provider_payment_id text,
  card_last4 text,
  message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS online_payments_restaurant_idx
  ON public.online_payments (restaurant_id, created_at DESC);

ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.online_payments FROM anon, authenticated;
