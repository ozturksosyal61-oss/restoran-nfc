-- OZT DIGITAL MENU
-- İngilizce çevirilerde aynı malzeme için tek terim: roka = "arugula"
-- ("rocket" ile karışık kullanılıyordu). Çeviri fonksiyonu artık sabit
-- terim sözlüğüyle çeviriyor (app/admin/menu/diller/actions.ts).

UPDATE public.products
SET translations = jsonb_set(
  translations,
  '{en}',
  regexp_replace(
    regexp_replace((translations->'en')::text, '\mrocket\M', 'arugula', 'g'),
    '\mRocket\M', 'Arugula', 'g'
  )::jsonb
)
WHERE jsonb_typeof(translations->'en') = 'object'
  AND (translations->'en')::text ~* '\mrocket\M';
