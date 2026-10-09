-- OZT DIGITAL MENU
-- Telefona bildirim: yalnızca oturumu açık kullanıcılara gönderilir.
--
-- Personel "Çıkış yap" dediğinde (ya da oturumu başka bir yoldan
-- kapandığında) Supabase oturum kaydı silinir. Bildirim gönderilmeden önce
-- bu fonksiyonla kontrol edilir; oturumu kalmayan kullanıcının cihaz
-- kayıtları silinir. Yalnızca sunucu (service role) çağırabilir.

DROP FUNCTION IF EXISTS public.push_users_with_session(uuid[]);

CREATE FUNCTION public.push_users_with_session(p_user_ids uuid[])
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT s.user_id), '{}'::uuid[])
  FROM auth.sessions s
  WHERE s.user_id = ANY (p_user_ids)
    AND (s.not_after IS NULL OR s.not_after > now());
$$;

REVOKE ALL ON FUNCTION public.push_users_with_session(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_users_with_session(uuid[]) TO service_role;
