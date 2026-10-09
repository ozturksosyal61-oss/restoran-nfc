-- OZT DIGITAL MENU
-- Anlık pano sinyali: sipariş, garson çağrısı ya da masa oturumu değişince
-- o restoranın ekranlarına "değişiklik var" haberi gider.
--
-- Sinyalin içinde veri yoktur (yalnızca hangi tablonun değiştiği). Ekranlar
-- haberi alınca verilerini bugünkü yollarıyla (RLS / sunucu) yeniden çeker;
-- veri erişim kuralları değişmez. Kanal özeldir ("board:<restoran id>"):
-- yalnızca o restoranın yöneticileri, aktif personeli ve sistem yöneticisi
-- dinleyebilir.
--
-- Bu dosya çalıştırılmazsa ekranlar eskisi gibi kısa aralıklarla kontrol
-- etmeye devam eder; hiçbir şey bozulmaz.

-- ---------------------------------------------------------------
-- 1) Kim dinleyebilir
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_receive_board_signal(p_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id bigint;
BEGIN
  IF auth.uid() IS NULL OR p_topic IS NULL OR p_topic !~ '^board:[0-9]{1,18}$' THEN
    RETURN false;
  END IF;

  v_restaurant_id := substr(p_topic, 7)::bigint;

  RETURN EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE ru.user_id = auth.uid() AND ru.restaurant_id = v_restaurant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_accounts sa
      WHERE sa.user_id = auth.uid() AND sa.restaurant_id = v_restaurant_id AND sa.is_active
    )
    OR public.is_system_admin();
END;
$$;

REVOKE ALL ON FUNCTION public.can_receive_board_signal(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_receive_board_signal(text) TO authenticated;

DROP POLICY IF EXISTS "Restaurant members receive board signals" ON realtime.messages;

CREATE POLICY "Restaurant members receive board signals"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND public.can_receive_board_signal(realtime.topic())
);

-- ---------------------------------------------------------------
-- 2) Sinyali gönderen tetikleyici
-- ---------------------------------------------------------------

-- Sinyal gönderilemezse (Realtime kapalı vb.) hata yutulur: sipariş,
-- çağrı ve ödeme işlemleri asla bu yüzden başarısız olmaz.
CREATE OR REPLACE FUNCTION public.signal_board_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_restaurant_id := OLD.restaurant_id;
  ELSE
    v_restaurant_id := NEW.restaurant_id;
  END IF;

  IF v_restaurant_id IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send(
        jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP),
        'changed',
        'board:' || v_restaurant_id,
        true
      );
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.signal_board_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_board_signal ON public.orders;
CREATE TRIGGER orders_board_signal
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.signal_board_change();

DROP TRIGGER IF EXISTS service_requests_board_signal ON public.service_requests;
CREATE TRIGGER service_requests_board_signal
AFTER INSERT OR UPDATE OR DELETE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.signal_board_change();

DO $$
BEGIN
  IF to_regclass('public.dining_sessions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS dining_sessions_board_signal ON public.dining_sessions;
    CREATE TRIGGER dining_sessions_board_signal
    AFTER INSERT OR UPDATE OR DELETE ON public.dining_sessions
    FOR EACH ROW EXECUTE FUNCTION public.signal_board_change();
  END IF;
END;
$$;
