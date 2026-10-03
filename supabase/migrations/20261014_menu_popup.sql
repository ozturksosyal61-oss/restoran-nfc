-- OZT DIGITAL MENU
-- Menü açılış duyurusu
--
-- Müşteri menüyü açtığında küçük bir pencere gösterilir ("Tatlılarda %50
-- indirim", "Bizi Instagram'da takip edin" gibi). İşletme sahibi panelden
-- açıp kapatır; başlığı, metni, görseli, düğmeyi ve düğmenin nereye
-- götüreceğini (bir menü kategorisi, Instagram ya da bir web adresi) belirler.
--
-- Ayarlar tek bir JSON sütununda tutulur. restaurants tablosu müşteri
-- sayfasına zaten açıktır; yazma mevcut kurallarla yalnızca restoranın
-- yöneticisine açıktır (demo hesabı yazamaz). Bağlantılar hem kaydederken
-- hem müşteri ekranında yeniden denetlenir (yalnızca https ve kategori).

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_popup jsonb;
