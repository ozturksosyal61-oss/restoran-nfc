-- OZT DIGITAL MENU
-- Haftalık rapor e-postası
--
--   * Her pazartesi 09:00'da (Vercel zamanlanmış görevi, /api/rapor/haftalik)
--     restoran sahibine geçen haftanın özeti e-postayla gider.
--   * restaurants.report_email_enabled: rapor açık mı (varsayılan açık;
--     e-postadaki "almak istemiyorum" bağlantısı ve panel kapatır).
--   * restaurants.report_email: alıcı; boşsa yöneticinin giriş e-postası.
--   * restaurants.report_email_sent_week: son gönderilen haftanın pazartesisi
--     (aynı hafta iki kez gönderilmesin).
--   * restaurants.report_unsubscribe_token: e-postadaki çıkış bağlantısı.
--   * Rapor fonksiyonları (get_sales_report, get_menu_stats) sunucunun
--     service role anahtarıyla da çağrılabilir; panel kullanıcıları için
--     yetki kuralı aynı kalır.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS report_email_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS report_email text;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS report_email_sent_week date;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS report_unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_report_email_format') THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_report_email_format CHECK (
        report_email IS NULL OR report_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      );
  END IF;
END;
$$;

-- 20261003 sürümü; service role (sunucu görevleri) eklendi.
CREATE OR REPLACE FUNCTION public.can_view_restaurant_reports(p_restaurant_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', false) OR (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.restaurant_users ru
        WHERE ru.restaurant_id = p_restaurant_id AND ru.user_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid())
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_report(bigint, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_menu_stats(bigint, timestamptz, timestamptz) TO service_role;
