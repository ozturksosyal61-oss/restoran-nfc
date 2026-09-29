-- OZT DIGITAL MENU
-- Çalışan telefonları yalnızca kendi restoranına
--
-- 20260928 dosyası telefonları giriş yapmamış ziyaretçilere kapatmıştı.
-- Ancak /kayit ile herkes hesap açıp giriş yapabildiği için, giriş yapmış
-- herhangi bir kullanıcı tüm restoranların çalışan telefonlarını
-- okuyabiliyordu. Artık telefon sütunu doğrudan okunamaz; restoran
-- yöneticisi kendi çalışanlarının telefonlarını get_employee_phones()
-- ile alır. Sistem yöneticisi tüm restoranları görebilir.
--
-- SIRA: Önce kodu yayına alın, sonra bu dosyayı çalıştırın. (Eski kod
-- telefon sütununu doğrudan okuduğu için, dosya önce çalışırsa eski
-- sürümde çalışanlar sayfası hata verir.)

REVOKE SELECT ON public.employees FROM authenticated;

DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name <> 'phone';

  EXECUTE format('GRANT SELECT (%s) ON public.employees TO authenticated', cols);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_phones(p_restaurant_id bigint)
RETURNS TABLE (id bigint, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Oturum gerekli.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurant_users
    WHERE user_id = auth.uid() AND restaurant_id = p_restaurant_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu restoran için yetkiniz yok.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.id::bigint, e.phone::text
  FROM public.employees e
  WHERE e.restaurant_id = p_restaurant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_phones(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_phones(bigint) TO authenticated;
