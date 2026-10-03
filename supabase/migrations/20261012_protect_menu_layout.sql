-- OZT DIGITAL MENU
-- Menü düzeni de yalnızca sistem panelinden değişir
--
-- Tema (restaurants.theme) zaten yalnızca sistem yöneticisi tarafından
-- değiştirilebiliyordu (20260929_aurora_color_themes.sql). İşletme
-- panelindeki "Menü düzeni" seçimi kaldırıldı; aynı koruma menu_layout
-- sütununa da uygulanır. (20260929 sürümü baz alındı.)

CREATE OR REPLACE FUNCTION public.protect_restaurant_theme()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.theme IS NOT DISTINCT FROM OLD.theme
     AND NEW.menu_layout IS NOT DISTINCT FROM OLD.menu_layout THEN
    RETURN NEW;
  END IF;

  -- Service role ve SQL Editor oturumsuz çalışır (auth.uid() boş).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Tema ve menü düzenini yalnızca sistem yöneticisi değiştirebilir.'
    USING ERRCODE = '42501';
END;
$$;
