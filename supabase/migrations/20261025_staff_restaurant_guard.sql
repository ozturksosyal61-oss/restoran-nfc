-- OZT DIGITAL MENU
-- Personel hesabı ile çalışanın aynı restorana ait olması veritabanında
-- zorunlu tutulur.
--
-- Hesap açılırken bu kontrolü uygulama zaten yapıyor; bu kural ek bir
-- güvenlik ağıdır: kodda bir hata olsa bile bir restoranın giriş hesabı
-- başka bir restoranın çalışanına bağlanamaz.

-- Bileşik anahtar için gerekli (id zaten benzersiz; yalnızca dizin eklenir).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_id_restaurant_key'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_id_restaurant_key UNIQUE (id, restaurant_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_accounts_employee_restaurant_fk'
  ) THEN
    ALTER TABLE public.staff_accounts
      ADD CONSTRAINT staff_accounts_employee_restaurant_fk
      FOREIGN KEY (employee_id, restaurant_id)
      REFERENCES public.employees (id, restaurant_id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END;
$$;
