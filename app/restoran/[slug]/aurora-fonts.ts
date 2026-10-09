import { Bricolage_Grotesque, Cormorant_Garamond, DM_Sans } from "next/font/google";

// Aurora sayfalarının ortak yazı tipleri. Restoran kabuğuna eklenir;
// tüm Aurora ekranları bu değişkenleri kullanır.
const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-aurora-display",
});

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-aurora-sans",
});

// Zest başlık yazı tipi. Zest paletleri --font-aurora-display'i buna
// yönlendirir (aurora-palette.module.css). Önceden yüklenmez; tarayıcı
// yalnızca Zest sayfasında kullanıldığında indirir.
const zestDisplay = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "800"],
  variable: "--font-zest-display",
  preload: false,
});

export const auroraFontVariables = `${display.variable} ${sans.variable} ${zestDisplay.variable}`;
