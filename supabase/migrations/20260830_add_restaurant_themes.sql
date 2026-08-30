-- OZT DIGITAL MENU
-- Restaurant themes

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'classic';

UPDATE public.restaurants
SET theme = 'classic'
WHERE theme IS NULL OR theme NOT IN ('classic', 'dark-modern', 'luxury-gold');

ALTER TABLE public.restaurants
DROP CONSTRAINT IF EXISTS restaurants_theme_valid;

ALTER TABLE public.restaurants
ADD CONSTRAINT restaurants_theme_valid
CHECK (theme IN ('classic', 'dark-modern', 'luxury-gold'));
