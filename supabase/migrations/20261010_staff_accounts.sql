-- OZT DIGITAL MENU
-- Garson ve mutfak giriş hesapları
--
-- İşletme yöneticisi "Çalışanlar" bölümünden garson / mutfak çalışanına
-- e-posta ve şifreyle giriş hesabı açar. Bu hesaplar restaurant_users
-- tablosuna EKLENMEZ: yönetici yetkisi yoktur, veritabanındaki hiçbir
-- işletme tablosunu doğrudan okuyamaz ya da değiştiremez. Garson ve mutfak
-- ekranlarının verisi sunucuda hazırlanır; sunucu her istekte bu tablodan
-- hesabın aktif olduğunu ve hangi restorana ait olduğunu doğrular.
--
-- Görev (garson / mutfak) çalışanın employees.role değerinden okunur;
-- yönetici çalışanın görevini değiştirirse ekran da değişir.

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id bigint NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  employee_id bigint NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE INDEX IF NOT EXISTS staff_accounts_restaurant_idx
  ON public.staff_accounts (restaurant_id);

-- Politika yok: yalnızca sunucu (service role) okur ve yazar.
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_accounts FROM anon, authenticated;
