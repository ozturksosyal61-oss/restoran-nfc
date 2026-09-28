import { Cormorant_Garamond, DM_Sans } from "next/font/google";

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

export const auroraFontVariables = `${display.variable} ${sans.variable}`;
