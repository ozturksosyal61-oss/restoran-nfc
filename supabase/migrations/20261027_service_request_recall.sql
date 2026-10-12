-- OZT DIGITAL MENU
-- Garson çağrısı / hesap isteği: takılı kalan çağrılar ve tekrar çağırma
--
-- Sorun: Aynı masada bekleyen aynı türde bir çağrı varsa yeni çağrı
-- açılmıyordu. Personel ekranı yalnızca son 12 saatin çağrılarını
-- gösterdiği için kapatılmadan unutulan bir çağrı ekrandan kayboluyor,
-- ama masayı günlerce "zaten çağrıldı" durumunda bırakıyordu; yeni
-- çağrı ve bildirim oluşmuyordu.
--
-- Çözüm (tüm çağrıların geçtiği create_table_service_request içinde):
--   * 30 dakikadan eski bekleyen çağrı kapatılır, yeni çağrı açılır.
--   * Son 30 dakikada bekleyen çağrı varsa ikinci kayıt açılmaz;
--     last_called_at güncellenir ve personele "tekrar çağırıyor"
--     bildirimi gider (en fazla dakikada bir).

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS last_called_at timestamptz;

-- Bir defalık temizlik: 12 saatten eski, kapatılmamış çağrılar.
UPDATE public.service_requests
SET status = 'completed', completed_at = now()
WHERE status IN ('pending', 'acknowledged')
  AND created_at < now() - interval '12 hours';

CREATE OR REPLACE FUNCTION public.create_table_service_request(
  p_restaurant_id bigint,
  p_public_token text,
  p_request_type text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id bigint;
  v_open record;
BEGIN
  SELECT rt.id
  INTO v_table_id
  FROM public.restaurant_tables rt
  WHERE rt.restaurant_id = p_restaurant_id
    AND rt.public_token::text = p_public_token
    AND rt.is_active = true;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'Masa doğrulaması başarısız.';
  END IF;

  -- Unutulmuş eski çağrılar kapatılır; yeni çağrı açılabilsin.
  UPDATE public.service_requests
  SET status = 'completed', completed_at = now()
  WHERE restaurant_id = p_restaurant_id
    AND table_id = v_table_id
    AND request_type = p_request_type
    AND status IN ('pending', 'acknowledged')
    AND created_at < now() - interval '30 minutes';

  -- Yakın zamanda açılmış çağrı varsa: tekrar çağırma (bildirim).
  SELECT sr.id, COALESCE(sr.last_called_at, sr.created_at) AS last_call
  INTO v_open
  FROM public.service_requests sr
  WHERE sr.restaurant_id = p_restaurant_id
    AND sr.table_id = v_table_id
    AND sr.request_type = p_request_type
    AND sr.status IN ('pending', 'acknowledged')
  ORDER BY sr.created_at DESC
  LIMIT 1;

  IF v_open.id IS NOT NULL THEN
    IF v_open.last_call < now() - interval '60 seconds' THEN
      UPDATE public.service_requests
      SET last_called_at = now(), status = 'pending'
      WHERE id = v_open.id;
    END IF;
    RETURN v_open.id;
  END IF;

  RETURN public.create_public_service_request(
    p_restaurant_id,
    v_table_id,
    p_request_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_table_service_request(bigint, text, text) TO anon, authenticated;

-- Bildirim tetikleyicisi: tekrar çağırmada da bildirim gider.
CREATE OR REPLACE FUNCTION public.queue_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_settings public.push_settings%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN
      v_event := 'order:new';
    ELSIF NEW.status = 'ready' AND OLD.status IS DISTINCT FROM 'ready' THEN
      v_event := 'order:ready';
    END IF;
  ELSIF TG_TABLE_NAME = 'service_requests' THEN
    IF TG_OP = 'INSERT' THEN
      v_event := 'request:new';
    ELSIF NEW.last_called_at IS DISTINCT FROM OLD.last_called_at AND NEW.last_called_at IS NOT NULL THEN
      v_event := 'request:new';
    END IF;
  END IF;

  IF v_event IS NULL OR NEW.restaurant_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE restaurant_id = NEW.restaurant_id) THEN
      RETURN NULL;
    END IF;

    SELECT * INTO v_settings FROM public.push_settings WHERE id = 1;
    IF NOT FOUND OR NOT v_settings.is_enabled THEN
      RETURN NULL;
    END IF;

    PERFORM net.http_post(
      url := v_settings.webhook_url,
      body := jsonb_build_object('event', v_event, 'id', NEW.id, 'restaurant_id', NEW.restaurant_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-ozt-secret', v_settings.webhook_secret),
      timeout_milliseconds := 10000
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_push_notification ON public.service_requests;
CREATE TRIGGER service_requests_push_notification
AFTER INSERT OR UPDATE OF last_called_at ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.queue_push_notification();
