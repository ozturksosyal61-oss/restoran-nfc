"use client";

import { useState } from "react";
import styles from "./tasarimlar.module.css";

// Bir menü tasarımının tanıtımı: iki telefon çerçevesinde ana sayfa ve
// menü, altında renk paletleri. Palet seçilince görüntüler değişir.
// Ekran görüntüleri public/tasarimlar/<tasarım>-<palet>-{ana-sayfa,menu}.webp.

export type ShowcasePalette = { key: string; label: string; ground: string; accent: string };

export type ShowcaseDesign = {
  key: string;
  name: string;
  forWhom: string;
  description: string;
  highlights: string[];
  palettes: ShowcasePalette[];
};

export default function DesignShowcase({ design, reverse }: { design: ShowcaseDesign; reverse?: boolean }) {
  const [palette, setPalette] = useState(design.palettes[0]);
  const base = `/tasarimlar/${design.key}-${palette.key}`;

  return (
    <article className={`${styles.design} ${reverse ? styles.designReverse : ""}`} id={design.key}>
      <div className={styles.designCopy}>
        <span className={styles.kicker}>{design.forWhom}</span>
        <h2 className={styles.designName}>{design.name}</h2>
        <p className={styles.designText}>{design.description}</p>
        <ul className={styles.highlights}>
          {design.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className={styles.paletteBlock}>
          <span className={styles.paletteLabel}>
            Renk paleti: <strong>{palette.label}</strong>
          </span>
          <div className={styles.palettes} role="radiogroup" aria-label={`${design.name} renk paletleri`}>
            {design.palettes.map((item) => (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={item.key === palette.key}
                aria-label={item.label}
                title={item.label}
                className={`${styles.swatch} ${item.key === palette.key ? styles.swatchOn : ""}`}
                style={{ background: item.ground, color: item.accent }}
                onClick={() => setPalette(item)}
              >
                <span className={styles.swatchDot} style={{ background: item.accent }} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.phones}>
        <figure className={styles.phoneFigure}>
          <div className={styles.phone} tabIndex={0} aria-label={`${design.name} ana sayfa, ${palette.label} (kaydırılabilir)`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${base}-ana-sayfa`}
              src={`${base}-ana-sayfa.webp`}
              alt={`${design.name} tasarımı, ${palette.label} paleti: restoran ana sayfası`}
              width={600}
              height={1600}
              loading="lazy"
            />
          </div>
          <figcaption>Ana sayfa</figcaption>
        </figure>
        <figure className={`${styles.phoneFigure} ${styles.phoneSecond}`}>
          <div className={styles.phone} tabIndex={0} aria-label={`${design.name} menü, ${palette.label} (kaydırılabilir)`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${base}-menu`}
              src={`${base}-menu.webp`}
              alt={`${design.name} tasarımı, ${palette.label} paleti: menü sayfası`}
              width={600}
              height={2770}
              loading="lazy"
            />
          </div>
          <figcaption>Menü</figcaption>
        </figure>
      </div>
    </article>
  );
}
