import {
  Bricolage_Grotesque,
  Cormorant_Garamond,
  DM_Sans,
  Instrument_Serif,
  Manrope,
  Sora,
  Unbounded,
} from "next/font/google";

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

// Linen yazı tipleri: zarif serif başlık, sade gövde. Linen paletleri
// Aurora değişkenlerini bunlara yönlendirir. Önceden yüklenmez.
const linenDisplay = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-linen-display",
  preload: false,
});

const linenSans = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-linen-sans",
  preload: false,
});

// Luna yazı tipleri: geniş, gece hissi veren başlık ve modern gövde.
// Luna paletleri Aurora değişkenlerini bunlara yönlendirir. Önceden yüklenmez.
const lunaDisplay = Unbounded({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  variable: "--font-luna-display",
  preload: false,
});

const lunaSans = Sora({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-luna-sans",
  preload: false,
});

export const auroraFontVariables = [
  display.variable,
  sans.variable,
  zestDisplay.variable,
  linenDisplay.variable,
  linenSans.variable,
  lunaDisplay.variable,
  lunaSans.variable,
].join(" ");
