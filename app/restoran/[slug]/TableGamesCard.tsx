"use client";

import { TABLE_GAMES } from "../../../lib/table-games";
import { useRestaurantTheme } from "./RestaurantThemeContext";
import styles from "./TableGames.module.css";

// Ana sayfadaki ve sipariş takip ekranındaki "Masa Oyunları" kartı.
// İşletme oyunları kapattıysa (ya da paket uygun değilse) hiç çizilmez.
export default function TableGamesCard({
  href,
  variant = "home",
}: {
  href: string;
  variant?: "home" | "tracking";
}) {
  const games = useRestaurantTheme()?.tableGames ?? [];
  if (games.length === 0) return null;

  const names = TABLE_GAMES.filter((game) => games.includes(game.id)).map((game) => game.name);

  return (
    <a className={styles.card} href={href}>
      <span className={styles.tile} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" strokeWidth="2.6" />
        </svg>
      </span>
      <span className={styles.text}>
        <strong>{variant === "tracking" ? "Beklerken oyna" : "Masa Oyunları"}</strong>
        <small>
          {variant === "tracking"
            ? "Siparişiniz hazırlanırken masaca bir oyun açın"
            : "Siparişinizi beklerken masaca oynayın"}
        </small>
        <span className={styles.chips}>
          {names.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </span>
      </span>
      <span className={styles.arrow} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}
