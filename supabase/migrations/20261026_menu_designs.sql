-- OZT DIGITAL MENU
-- Yeni menü tasarımları: Zest, Linen ve Luna temaları
--
-- restaurants.theme izin listesine yeni tasarımların renk paletleri
-- eklenir. Zest bu sürümde kullanıma açılır; Linen ve Luna değerleri
-- ileride ayrıca migration gerekmesin diye şimdiden eklenmiştir.

DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.restaurants'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%theme%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.restaurants DROP CONSTRAINT %I',
      v_constraint.conname
    );
  END LOOP;
END;
$$;

ALTER TABLE public.restaurants
ADD CONSTRAINT restaurants_theme_valid
CHECK (
  theme IN (
    'classic',
    'dark-modern',
    'luxury-gold',
    'ozt-glass-premium',
    'ozt-nova-premium',
    'aurora',
    'aurora-krem',
    'aurora-gold',
    'aurora-zeytin',
    'aurora-bordo',
    'aurora-lacivert',
    'aurora-mermer',
    'zest-kirmizi',
    'zest-turuncu',
    'zest-yesil',
    'zest-mavi',
    'linen-fildisi',
    'linen-beyaz',
    'linen-zeytin',
    'linen-bordo',
    'luna-nane',
    'luna-amber',
    'luna-mavi',
    'luna-pembe'
  )
) NOT VALID;
