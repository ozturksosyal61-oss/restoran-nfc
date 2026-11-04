-- OZT DIGITAL
-- Mobil uygulamalar vitrini (/uygulamalar) ve /sistem → Uygulamalar yönetimi.
-- Yazma işlemleri yalnızca sunucudaki service role ile yapılır (yetki kontrolü
-- requireSystemAdmin); anon/authenticated için yazma politikası YOKTUR.

CREATE TABLE IF NOT EXISTS public.apps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text NOT NULL,
  tagline       text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  icon_path     text,
  screenshots   text[] NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'gizli' CHECK (status IN ('yayinda', 'beta', 'yakinda', 'gizli')),
  app_store_url text,
  play_store_url text,
  accent_color  text NOT NULL DEFAULT '#d9b866' CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  privacy_url   text,
  support_url   text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apps_public_read" ON public.apps;
CREATE POLICY "apps_public_read" ON public.apps
  FOR SELECT TO anon, authenticated
  USING (status <> 'gizli');

-- Herkese açık okuma için görsel kovası. storage.objects üzerinde yazma
-- politikası tanımlanmaz: yükleme/silme yalnızca service role ile yapılır.
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-images', 'app-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO public.apps (slug, name, tagline, description, status, accent_color, sort_order)
VALUES
  ('kurdan', 'Kürdan', 'Kalori ve Makro Takibi',
   'Yemeğinin fotoğrafını çek; yapay zeka yemeği tanısın, gramajı, kaloriyi ve makroları (protein, karbonhidrat, yağ) senin yerine tahmin etsin.',
   'yayinda', '#4ade80', 1),
  ('bluff-house', 'Bluff House', 'Meyhanede blöf zamanı',
   '1920''ler İstanbul meyhanesinde geçen online blöf kart oyunu. Masaya otur, sesli sohbetle arkadaşlarına blöf yap, kartlarını doğru oyna.',
   'beta', '#e0a458', 2)
ON CONFLICT (slug) DO NOTHING;
