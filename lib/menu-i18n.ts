// Çok dilli menü: desteklenen diller, çeviri seçimi ve menü ekranının
// sabit metinleri. Hem sunucu hem tarayıcı kodunda kullanılır.

export const MENU_LANGUAGES = [
  { code: "en", label: "English", turkish: "İngilizce", flag: "EN" },
  { code: "de", label: "Deutsch", turkish: "Almanca", flag: "DE" },
  { code: "ru", label: "Русский", turkish: "Rusça", flag: "RU" },
  { code: "ar", label: "العربية", turkish: "Arapça", flag: "AR" },
  { code: "fr", label: "Français", turkish: "Fransızca", flag: "FR" },
] as const;

export type MenuLanguage = (typeof MENU_LANGUAGES)[number]["code"];
export type DisplayLanguage = "tr" | MenuLanguage;

export function isMenuLanguage(value: unknown): value is MenuLanguage {
  return MENU_LANGUAGES.some((language) => language.code === value);
}

export function languageMeta(code: MenuLanguage) {
  return MENU_LANGUAGES.find((language) => language.code === code)!;
}

export function normalizeLanguages(value: unknown): MenuLanguage[] {
  if (!Array.isArray(value)) return [];
  return MENU_LANGUAGES.map((language) => language.code).filter((code) =>
    value.includes(code)
  );
}

export type TranslatedFields = {
  name?: string;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  // Çevirinin yapıldığı Türkçe metnin parmak izi.
  src?: string;
};

export type Translations = Partial<Record<MenuLanguage, TranslatedFields>>;

export type TranslatableSource = {
  name: string;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
};

// Türkçe metinden kısa bir parmak izi. Ürün değişince çeviri eskir.
export function sourceFingerprint(item: TranslatableSource) {
  const text = [item.name, item.description, item.ingredients, item.allergens]
    .map((part) => (part ?? "").trim())
    .join("␟");

  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function readTranslations(value: unknown): Translations {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Translations)
    : {};
}

// Güncel bir çeviri var mı? (Türkçe metin değiştiyse yok sayılır.)
export function currentTranslation(
  item: TranslatableSource & { translations?: unknown },
  language: MenuLanguage
): TranslatedFields | null {
  const entry = readTranslations(item.translations)[language];
  if (!entry?.name?.trim()) return null;
  if (entry.src !== sourceFingerprint(item)) return null;
  return entry;
}

// Seçili dile göre gösterilecek metinler; çeviri yoksa Türkçe.
export function localize<T extends TranslatableSource & { translations?: unknown }>(
  item: T,
  language: DisplayLanguage
): T {
  if (language === "tr") return item;
  const entry = currentTranslation(item, language);
  if (!entry) return item;

  return {
    ...item,
    name: entry.name?.trim() || item.name,
    description: item.description?.trim() ? entry.description?.trim() || item.description : item.description,
    ingredients: item.ingredients?.trim() ? entry.ingredients?.trim() || item.ingredients : item.ingredients,
    allergens: item.allergens?.trim() ? entry.allergens?.trim() || item.allergens : item.allergens,
  };
}

/* ---------------- Menü ekranı metinleri ---------------- */

const tr = {
  preparing: "Menü hazırlanıyor",
  preparingSub: "Birkaç saniye sürebilir.",
  cantOpen: "Menü açılamadı",
  notFound: "İşletme bulunamadı.",
  loadError: "Menü yüklenirken bir sorun oluştu. Sayfayı yenileyin.",
  home: "Ana sayfa",
  backHome: "Ana sayfaya dön",
  categories: "Kategoriler",
  all: "Tümü",
  menu: "Menü",
  table: "Masa",
  tableService: "Masaya hizmet",
  myOrder: "Siparişim",
  myOrderSub: "Son siparişinizin durumu",
  pay: "Ödeme yap",
  paySub: "Masa hesabını görüntüleyin",
  serviceAria: "Garson çağır veya hesap iste",
  search: "Menüde ara",
  clearSearch: "Aramayı temizle",
  closedTitle: "Şu an kapalıyız",
  closedSub: "Menümüzü inceleyebilirsiniz.",
  noOrdersTitle: "Şu an sipariş alınmıyor",
  noOrdersSub: "Menüyü inceleyebilirsiniz; siparişler işletme açıldığında alınır.",
  scanTitle: "Sipariş için masadaki QR kodu okutun",
  scanSub: "Menüye göz atabilir, sepetinizi hazırlayabilirsiniz.",
  resultsFor: (query: string, count: number) => `“${query}” için ${count} ürün`,
  items: (count: number) => `${count} ürün`,
  noResults: "Aramanızla eşleşen ürün yok",
  noResultsSub: "Farklı bir kelime deneyin ya da tüm menüye dönün.",
  emptyMenu: "Menü henüz hazır değil",
  emptyMenuSub: "İşletme menüsünü eklediğinde ürünler burada görünecek.",
  showAll: "Tüm menüyü göster",
  viewCart: "Sepeti gör",
  added: (name: string, quantity: number) =>
    quantity > 1 ? `${name} · ${quantity} adet sepete eklendi` : `${name} sepete eklendi`,
  staleCart: "Sepetinizde bu menüde olmayan ürünler vardı, çıkarıldı.",
  waiterSent: "Garson çağrınız iletildi",
  billSent: "Hesap isteğiniz iletildi",
  requestFailed: "Talep gönderilemedi. Tekrar deneyin ya da bir görevliye seslenin.",
  helpTitle: "Size nasıl yardımcı olalım?",
  noTableLink: "Masa bağlantısı yok",
  close: "Kapat",
  callWaiter: "Garson çağır",
  callWaiterSub: "Masanıza bir görevli gelsin",
  waiterCalled: "Garson çağrıldı",
  askBill: "Hesap iste",
  askBillSub: "Adisyon masanıza getirilsin",
  billAsked: "Hesap istendi",
  sending: "Gönderiliyor…",
  requestDone: "Talebiniz iletildi · tekrar göndermek için dokunun",
  scanTable: "Masadaki QR kodu okutun",
  scanTableSub:
    "Garson çağırmak ve hesap istemek için masanızdaki QR kodu okutun ya da NFC etiketine telefonunuzu yaklaştırın.",
  scanForWaiter: "Garson çağırmak için masadaki QR kodu okutun.",
  inCartMore: (name: string, quantity: number) => `${name} sepette ${quantity} adet, bir tane daha ekle`,
  addToCartAria: (name: string) => `${name} sepete ekle`,
  ingredients: "İçindekiler",
  allergens: "Alerjenler",
  inCart: (count: number) => `Sepetinizde ${count} adet var.`,
  decrease: "Adedi azalt",
  increase: "Adedi artır",
  addToCart: "Sepete ekle",
  cart: "Sepet",
  myCart: "Sepetim",
  noItems: "Henüz ürün yok",
  cartEmpty: "Sepetiniz boş",
  cartEmptySub: "Beğendiğiniz ürünün yanındaki + düğmesine dokunun.",
  removeItem: (name: string) => `${name} ürününü kaldır`,
  decreaseItem: (name: string) => `${name} adedini azalt`,
  increaseItem: (name: string) => `${name} adedini artır`,
  total: "Toplam",
  cartNeedsTable: "Siparişi göndermek için masadaki QR kodu okutmanız gerekir.",
  checkout: "Siparişe geç",
  backToMenu: "Menüye dön",
  language: "Dil",
  rateUs: "Bizi değerlendirin",
};

export type MenuStrings = typeof tr;

const en: MenuStrings = {
  preparing: "Preparing the menu",
  preparingSub: "This may take a few seconds.",
  cantOpen: "The menu could not be opened",
  notFound: "Venue not found.",
  loadError: "Something went wrong while loading the menu. Please refresh the page.",
  home: "Home",
  backHome: "Back to home",
  categories: "Categories",
  all: "All",
  menu: "Menu",
  table: "Table",
  tableService: "Table service",
  myOrder: "My order",
  myOrderSub: "Status of your last order",
  pay: "Pay",
  paySub: "View the table bill",
  serviceAria: "Call a waiter or ask for the bill",
  search: "Search the menu",
  clearSearch: "Clear search",
  closedTitle: "We are closed right now",
  closedSub: "You can still browse our menu.",
  noOrdersTitle: "We are not taking orders right now",
  noOrdersSub: "You can browse the menu; orders open when we do.",
  scanTitle: "Scan the QR code on your table to order",
  scanSub: "You can browse the menu and fill your cart.",
  resultsFor: (query, count) => `${count} ${count === 1 ? "item" : "items"} for “${query}”`,
  items: (count) => `${count} ${count === 1 ? "item" : "items"}`,
  noResults: "No items match your search",
  noResultsSub: "Try another word or go back to the full menu.",
  emptyMenu: "The menu is not ready yet",
  emptyMenuSub: "Items will appear here once the venue adds its menu.",
  showAll: "Show the full menu",
  viewCart: "View cart",
  added: (name, quantity) => (quantity > 1 ? `${quantity} × ${name} added to cart` : `${name} added to cart`),
  staleCart: "Some items in your cart are not on this menu and were removed.",
  waiterSent: "A waiter is on the way",
  billSent: "Your bill request was sent",
  requestFailed: "The request could not be sent. Try again or ask a member of staff.",
  helpTitle: "How can we help?",
  noTableLink: "No table linked",
  close: "Close",
  callWaiter: "Call a waiter",
  callWaiterSub: "A member of staff will come to your table",
  waiterCalled: "Waiter called",
  askBill: "Ask for the bill",
  askBillSub: "The bill will be brought to your table",
  billAsked: "Bill requested",
  sending: "Sending…",
  requestDone: "Request sent · tap to send again",
  scanTable: "Scan the QR code on your table",
  scanTableSub:
    "To call a waiter or ask for the bill, scan the QR code on your table or hold your phone to the NFC tag.",
  scanForWaiter: "Scan the QR code on your table to call a waiter.",
  inCartMore: (name, quantity) => `${quantity} × ${name} in cart, add one more`,
  addToCartAria: (name) => `Add ${name} to cart`,
  ingredients: "Ingredients",
  allergens: "Allergens",
  inCart: (count) => `You have ${count} in your cart.`,
  decrease: "Decrease quantity",
  increase: "Increase quantity",
  addToCart: "Add to cart",
  cart: "Cart",
  myCart: "My cart",
  noItems: "No items yet",
  cartEmpty: "Your cart is empty",
  cartEmptySub: "Tap the + button next to an item you like.",
  removeItem: (name) => `Remove ${name}`,
  decreaseItem: (name) => `Decrease ${name}`,
  increaseItem: (name) => `Increase ${name}`,
  total: "Total",
  cartNeedsTable: "Scan the QR code on your table to send the order.",
  checkout: "Go to checkout",
  backToMenu: "Back to menu",
  language: "Language",
  rateUs: "Rate us",
};

const de: MenuStrings = {
  preparing: "Die Speisekarte wird geladen",
  preparingSub: "Das kann einige Sekunden dauern.",
  cantOpen: "Die Speisekarte konnte nicht geöffnet werden",
  notFound: "Betrieb nicht gefunden.",
  loadError: "Beim Laden der Speisekarte ist ein Fehler aufgetreten. Bitte laden Sie die Seite neu.",
  home: "Startseite",
  backHome: "Zurück zur Startseite",
  categories: "Kategorien",
  all: "Alle",
  menu: "Speisekarte",
  table: "Tisch",
  tableService: "Service am Tisch",
  myOrder: "Meine Bestellung",
  myOrderSub: "Status Ihrer letzten Bestellung",
  pay: "Bezahlen",
  paySub: "Tischrechnung ansehen",
  serviceAria: "Bedienung rufen oder Rechnung verlangen",
  search: "Speisekarte durchsuchen",
  clearSearch: "Suche löschen",
  closedTitle: "Wir haben gerade geschlossen",
  closedSub: "Sie können unsere Speisekarte trotzdem ansehen.",
  noOrdersTitle: "Derzeit keine Bestellungen möglich",
  noOrdersSub: "Sie können die Speisekarte ansehen; Bestellungen sind nach der Öffnung möglich.",
  scanTitle: "Scannen Sie zum Bestellen den QR-Code am Tisch",
  scanSub: "Sie können die Speisekarte ansehen und Ihren Warenkorb füllen.",
  resultsFor: (query, count) => `${count} ${count === 1 ? "Artikel" : "Artikel"} für „${query}“`,
  items: (count) => `${count} Artikel`,
  noResults: "Keine passenden Artikel gefunden",
  noResultsSub: "Versuchen Sie ein anderes Wort oder kehren Sie zur ganzen Speisekarte zurück.",
  emptyMenu: "Die Speisekarte ist noch nicht fertig",
  emptyMenuSub: "Die Artikel erscheinen hier, sobald der Betrieb seine Speisekarte hinzufügt.",
  showAll: "Ganze Speisekarte zeigen",
  viewCart: "Warenkorb",
  added: (name, quantity) =>
    quantity > 1 ? `${quantity} × ${name} in den Warenkorb gelegt` : `${name} in den Warenkorb gelegt`,
  staleCart: "Einige Artikel in Ihrem Warenkorb sind nicht auf dieser Speisekarte und wurden entfernt.",
  waiterSent: "Die Bedienung kommt gleich",
  billSent: "Ihre Rechnungsanfrage wurde gesendet",
  requestFailed: "Die Anfrage konnte nicht gesendet werden. Versuchen Sie es erneut oder sprechen Sie das Personal an.",
  helpTitle: "Wie können wir helfen?",
  noTableLink: "Kein Tisch verknüpft",
  close: "Schließen",
  callWaiter: "Bedienung rufen",
  callWaiterSub: "Jemand kommt an Ihren Tisch",
  waiterCalled: "Bedienung gerufen",
  askBill: "Rechnung verlangen",
  askBillSub: "Die Rechnung wird an Ihren Tisch gebracht",
  billAsked: "Rechnung angefordert",
  sending: "Wird gesendet…",
  requestDone: "Anfrage gesendet · zum erneuten Senden tippen",
  scanTable: "Scannen Sie den QR-Code am Tisch",
  scanTableSub:
    "Um die Bedienung zu rufen oder die Rechnung zu verlangen, scannen Sie den QR-Code am Tisch oder halten Sie Ihr Telefon an das NFC-Etikett.",
  scanForWaiter: "Scannen Sie den QR-Code am Tisch, um die Bedienung zu rufen.",
  inCartMore: (name, quantity) => `${quantity} × ${name} im Warenkorb, noch eins hinzufügen`,
  addToCartAria: (name) => `${name} in den Warenkorb`,
  ingredients: "Zutaten",
  allergens: "Allergene",
  inCart: (count) => `${count} Stück im Warenkorb.`,
  decrease: "Menge verringern",
  increase: "Menge erhöhen",
  addToCart: "In den Warenkorb",
  cart: "Warenkorb",
  myCart: "Mein Warenkorb",
  noItems: "Noch keine Artikel",
  cartEmpty: "Ihr Warenkorb ist leer",
  cartEmptySub: "Tippen Sie auf + neben einem Artikel.",
  removeItem: (name) => `${name} entfernen`,
  decreaseItem: (name) => `${name} verringern`,
  increaseItem: (name) => `${name} erhöhen`,
  total: "Gesamt",
  cartNeedsTable: "Scannen Sie den QR-Code am Tisch, um die Bestellung zu senden.",
  checkout: "Zur Bestellung",
  backToMenu: "Zurück zur Speisekarte",
  language: "Sprache",
  rateUs: "Bewerten Sie uns",
};

const ru: MenuStrings = {
  preparing: "Меню загружается",
  preparingSub: "Это может занять несколько секунд.",
  cantOpen: "Не удалось открыть меню",
  notFound: "Заведение не найдено.",
  loadError: "При загрузке меню произошла ошибка. Обновите страницу.",
  home: "Главная",
  backHome: "На главную",
  categories: "Категории",
  all: "Все",
  menu: "Меню",
  table: "Стол",
  tableService: "Обслуживание",
  myOrder: "Мой заказ",
  myOrderSub: "Статус последнего заказа",
  pay: "Оплатить",
  paySub: "Посмотреть счёт стола",
  serviceAria: "Позвать официанта или попросить счёт",
  search: "Поиск по меню",
  clearSearch: "Очистить поиск",
  closedTitle: "Сейчас мы закрыты",
  closedSub: "Вы можете посмотреть наше меню.",
  noOrdersTitle: "Сейчас заказы не принимаются",
  noOrdersSub: "Вы можете посмотреть меню; заказы принимаются в часы работы.",
  scanTitle: "Чтобы заказать, отсканируйте QR-код на столе",
  scanSub: "Вы можете посмотреть меню и собрать корзину.",
  resultsFor: (query, count) => `Найдено: ${count} по запросу «${query}»`,
  items: (count) => `${count} поз.`,
  noResults: "Ничего не найдено",
  noResultsSub: "Попробуйте другое слово или вернитесь ко всему меню.",
  emptyMenu: "Меню ещё не готово",
  emptyMenuSub: "Блюда появятся здесь, когда заведение добавит меню.",
  showAll: "Показать всё меню",
  viewCart: "Корзина",
  added: (name, quantity) => (quantity > 1 ? `${name} × ${quantity} в корзине` : `${name} в корзине`),
  staleCart: "Некоторых позиций из корзины нет в этом меню, они удалены.",
  waiterSent: "Официант уже идёт",
  billSent: "Запрос счёта отправлен",
  requestFailed: "Не удалось отправить запрос. Попробуйте ещё раз или обратитесь к персоналу.",
  helpTitle: "Чем можем помочь?",
  noTableLink: "Стол не привязан",
  close: "Закрыть",
  callWaiter: "Позвать официанта",
  callWaiterSub: "К вашему столу подойдут",
  waiterCalled: "Официант вызван",
  askBill: "Попросить счёт",
  askBillSub: "Счёт принесут к вашему столу",
  billAsked: "Счёт запрошен",
  sending: "Отправка…",
  requestDone: "Запрос отправлен · нажмите, чтобы повторить",
  scanTable: "Отсканируйте QR-код на столе",
  scanTableSub:
    "Чтобы позвать официанта или попросить счёт, отсканируйте QR-код на столе или поднесите телефон к NFC-метке.",
  scanForWaiter: "Отсканируйте QR-код на столе, чтобы позвать официанта.",
  inCartMore: (name, quantity) => `${name}: ${quantity} в корзине, добавить ещё`,
  addToCartAria: (name) => `Добавить ${name} в корзину`,
  ingredients: "Состав",
  allergens: "Аллергены",
  inCart: (count) => `В корзине: ${count}.`,
  decrease: "Уменьшить",
  increase: "Увеличить",
  addToCart: "В корзину",
  cart: "Корзина",
  myCart: "Моя корзина",
  noItems: "Пока пусто",
  cartEmpty: "Корзина пуста",
  cartEmptySub: "Нажмите + рядом с понравившимся блюдом.",
  removeItem: (name) => `Удалить ${name}`,
  decreaseItem: (name) => `Уменьшить ${name}`,
  increaseItem: (name) => `Увеличить ${name}`,
  total: "Итого",
  cartNeedsTable: "Чтобы отправить заказ, отсканируйте QR-код на столе.",
  checkout: "Оформить заказ",
  backToMenu: "Вернуться в меню",
  language: "Язык",
  rateUs: "Оцените нас",
};

const ar: MenuStrings = {
  preparing: "جارٍ تحضير القائمة",
  preparingSub: "قد يستغرق ذلك بضع ثوانٍ.",
  cantOpen: "تعذّر فتح القائمة",
  notFound: "لم يتم العثور على المطعم.",
  loadError: "حدثت مشكلة أثناء تحميل القائمة. يرجى تحديث الصفحة.",
  home: "الرئيسية",
  backHome: "العودة إلى الرئيسية",
  categories: "الأقسام",
  all: "الكل",
  menu: "القائمة",
  table: "طاولة",
  tableService: "خدمة الطاولة",
  myOrder: "طلبي",
  myOrderSub: "حالة طلبك الأخير",
  pay: "الدفع",
  paySub: "عرض فاتورة الطاولة",
  serviceAria: "استدعاء النادل أو طلب الفاتورة",
  search: "ابحث في القائمة",
  clearSearch: "مسح البحث",
  closedTitle: "نحن مغلقون الآن",
  closedSub: "يمكنك تصفح قائمتنا.",
  noOrdersTitle: "لا نستقبل الطلبات حاليًا",
  noOrdersSub: "يمكنك تصفح القائمة؛ تُستقبل الطلبات عند الافتتاح.",
  scanTitle: "امسح رمز QR الموجود على طاولتك للطلب",
  scanSub: "يمكنك تصفح القائمة وتجهيز سلتك.",
  resultsFor: (query, count) => `${count} نتيجة لـ «${query}»`,
  items: (count) => `${count} صنف`,
  noResults: "لا توجد أصناف مطابقة",
  noResultsSub: "جرّب كلمة أخرى أو عد إلى القائمة كاملة.",
  emptyMenu: "القائمة ليست جاهزة بعد",
  emptyMenuSub: "ستظهر الأصناف هنا عندما يضيف المطعم قائمته.",
  showAll: "عرض القائمة كاملة",
  viewCart: "عرض السلة",
  added: (name, quantity) => (quantity > 1 ? `أُضيف ${quantity} × ${name} إلى السلة` : `أُضيف ${name} إلى السلة`),
  staleCart: "بعض الأصناف في سلتك غير موجودة في هذه القائمة وتمت إزالتها.",
  waiterSent: "النادل في الطريق إليك",
  billSent: "تم إرسال طلب الفاتورة",
  requestFailed: "تعذّر إرسال الطلب. حاول مرة أخرى أو اطلب من أحد الموظفين.",
  helpTitle: "كيف يمكننا مساعدتك؟",
  noTableLink: "لا توجد طاولة مرتبطة",
  close: "إغلاق",
  callWaiter: "استدعاء النادل",
  callWaiterSub: "سيأتي أحد الموظفين إلى طاولتك",
  waiterCalled: "تم استدعاء النادل",
  askBill: "طلب الفاتورة",
  askBillSub: "ستُحضر الفاتورة إلى طاولتك",
  billAsked: "تم طلب الفاتورة",
  sending: "جارٍ الإرسال…",
  requestDone: "تم إرسال الطلب · اضغط لإعادة الإرسال",
  scanTable: "امسح رمز QR على طاولتك",
  scanTableSub: "لاستدعاء النادل أو طلب الفاتورة، امسح رمز QR على طاولتك أو قرّب هاتفك من ملصق NFC.",
  scanForWaiter: "امسح رمز QR على طاولتك لاستدعاء النادل.",
  inCartMore: (name, quantity) => `${quantity} × ${name} في السلة، أضف واحدًا آخر`,
  addToCartAria: (name) => `أضف ${name} إلى السلة`,
  ingredients: "المكوّنات",
  allergens: "مسببات الحساسية",
  inCart: (count) => `في سلتك ${count}.`,
  decrease: "إنقاص الكمية",
  increase: "زيادة الكمية",
  addToCart: "أضف إلى السلة",
  cart: "السلة",
  myCart: "سلتي",
  noItems: "لا توجد أصناف بعد",
  cartEmpty: "سلتك فارغة",
  cartEmptySub: "اضغط على زر + بجانب الصنف الذي يعجبك.",
  removeItem: (name) => `إزالة ${name}`,
  decreaseItem: (name) => `إنقاص ${name}`,
  increaseItem: (name) => `زيادة ${name}`,
  total: "المجموع",
  cartNeedsTable: "لإرسال الطلب، امسح رمز QR الموجود على طاولتك.",
  checkout: "متابعة الطلب",
  backToMenu: "العودة إلى القائمة",
  language: "اللغة",
  rateUs: "قيّمنا",
};

const fr: MenuStrings = {
  preparing: "Préparation du menu",
  preparingSub: "Cela peut prendre quelques secondes.",
  cantOpen: "Impossible d’ouvrir le menu",
  notFound: "Établissement introuvable.",
  loadError: "Un problème est survenu lors du chargement du menu. Veuillez actualiser la page.",
  home: "Accueil",
  backHome: "Retour à l’accueil",
  categories: "Catégories",
  all: "Tout",
  menu: "Menu",
  table: "Table",
  tableService: "Service à table",
  myOrder: "Ma commande",
  myOrderSub: "État de votre dernière commande",
  pay: "Payer",
  paySub: "Voir l’addition de la table",
  serviceAria: "Appeler un serveur ou demander l’addition",
  search: "Rechercher dans le menu",
  clearSearch: "Effacer la recherche",
  closedTitle: "Nous sommes fermés pour le moment",
  closedSub: "Vous pouvez consulter notre menu.",
  noOrdersTitle: "Commandes indisponibles pour le moment",
  noOrdersSub: "Vous pouvez consulter le menu ; les commandes reprennent à l’ouverture.",
  scanTitle: "Scannez le QR code de votre table pour commander",
  scanSub: "Vous pouvez consulter le menu et remplir votre panier.",
  resultsFor: (query, count) => `${count} ${count === 1 ? "article" : "articles"} pour « ${query} »`,
  items: (count) => `${count} ${count === 1 ? "article" : "articles"}`,
  noResults: "Aucun article ne correspond",
  noResultsSub: "Essayez un autre mot ou revenez au menu complet.",
  emptyMenu: "Le menu n’est pas encore prêt",
  emptyMenuSub: "Les articles apparaîtront ici dès que l’établissement aura ajouté son menu.",
  showAll: "Voir tout le menu",
  viewCart: "Voir le panier",
  added: (name, quantity) => (quantity > 1 ? `${quantity} × ${name} ajouté au panier` : `${name} ajouté au panier`),
  staleCart: "Certains articles de votre panier ne figurent pas sur ce menu et ont été retirés.",
  waiterSent: "Un serveur arrive",
  billSent: "Votre demande d’addition a été envoyée",
  requestFailed: "La demande n’a pas pu être envoyée. Réessayez ou adressez-vous au personnel.",
  helpTitle: "Comment pouvons-nous vous aider ?",
  noTableLink: "Aucune table associée",
  close: "Fermer",
  callWaiter: "Appeler un serveur",
  callWaiterSub: "Quelqu’un viendra à votre table",
  waiterCalled: "Serveur appelé",
  askBill: "Demander l’addition",
  askBillSub: "L’addition sera apportée à votre table",
  billAsked: "Addition demandée",
  sending: "Envoi…",
  requestDone: "Demande envoyée · touchez pour renvoyer",
  scanTable: "Scannez le QR code de votre table",
  scanTableSub:
    "Pour appeler un serveur ou demander l’addition, scannez le QR code de votre table ou approchez votre téléphone de l’étiquette NFC.",
  scanForWaiter: "Scannez le QR code de votre table pour appeler un serveur.",
  inCartMore: (name, quantity) => `${quantity} × ${name} dans le panier, en ajouter un`,
  addToCartAria: (name) => `Ajouter ${name} au panier`,
  ingredients: "Ingrédients",
  allergens: "Allergènes",
  inCart: (count) => `${count} dans votre panier.`,
  decrease: "Diminuer la quantité",
  increase: "Augmenter la quantité",
  addToCart: "Ajouter au panier",
  cart: "Panier",
  myCart: "Mon panier",
  noItems: "Aucun article",
  cartEmpty: "Votre panier est vide",
  cartEmptySub: "Touchez le bouton + à côté d’un article.",
  removeItem: (name) => `Retirer ${name}`,
  decreaseItem: (name) => `Diminuer ${name}`,
  increaseItem: (name) => `Augmenter ${name}`,
  total: "Total",
  cartNeedsTable: "Scannez le QR code de votre table pour envoyer la commande.",
  checkout: "Commander",
  backToMenu: "Retour au menu",
  language: "Langue",
  rateUs: "Donnez votre avis",
};

const STRINGS: Record<DisplayLanguage, MenuStrings> = { tr, en, de, ru, ar, fr };

export function menuStrings(language: DisplayLanguage): MenuStrings {
  return STRINGS[language] ?? tr;
}

export function isRtl(language: DisplayLanguage) {
  return language === "ar";
}
