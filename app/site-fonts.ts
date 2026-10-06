import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

// Tanıtım sitesinin yazı tipleri: ana sayfa, açılış sayfaları ve ortak footer.
export const displayFont = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const siteFontClass = `${displayFont.variable} ${sansFont.variable}`;
