-- OZT DIGITAL MENU
-- Başlangıç paketi = sadece menü
--
-- Restoran türü (restaurants.menu_only) artık ayrı seçilmez; paketten gelir:
--   starter (Başlangıç)  → menu_only = true  (tek QR, masa / sipariş / garson yok)
--   pro, premium         → menu_only = false
-- Paket nereden değişirse değişsin (sistem paneli, abonelik, otomatik ödeme)
-- tür kendiliğinden uyumlu kalır. Sadece menü restoranında sipariş ve garson
-- çağrısını veritabanı zaten reddediyor (20260930_menu_only_restaurants.sql).
--
-- ÖNCE KONTROL: Bu dosyayı çalıştırmadan önce aşağıdaki sorguyla türü
-- değişecek restoranları görün (Başlangıç'ta olup sipariş alanlar menüye
-- döner; Pro/Premium'da olup sadece menü olanlar sipariş almaya başlar):
--
--   select id, name, slug, plan, menu_only
--   from public.restaurants
--   where menu_only is distinct from (coalesce(plan, 'starter') not in ('pro', 'premium'));

CREATE OR REPLACE FUNCTION public.sync_menu_only_from_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.menu_only := COALESCE(NEW.plan, 'starter') NOT IN ('pro', 'premium');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_menu_only_from_plan ON public.restaurants;

CREATE TRIGGER sync_menu_only_from_plan
BEFORE INSERT OR UPDATE OF plan, menu_only ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.sync_menu_only_from_plan();

-- Mevcut restoranları pakete göre eşitle.
UPDATE public.restaurants
SET menu_only = COALESCE(plan, 'starter') NOT IN ('pro', 'premium')
WHERE menu_only IS DISTINCT FROM (COALESCE(plan, 'starter') NOT IN ('pro', 'premium'));
