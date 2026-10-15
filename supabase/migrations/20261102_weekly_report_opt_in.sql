-- OZT DIGITAL MENU
-- Haftalık rapor e-postası varsayılan olarak KAPALI
--
-- Yeni restoranlarda rapor kapalı başlar; isteyen işletme panelinden
-- (Raporlar → Dönem özeti → Haftalık rapor e-postası) açar.
-- Mevcut restoranların hepsinde de kapatılır.

ALTER TABLE public.restaurants
  ALTER COLUMN report_email_enabled SET DEFAULT false;

UPDATE public.restaurants
SET report_email_enabled = false
WHERE report_email_enabled = true;
