"use client";

import { useEffect, useRef, useState } from "react";
import { TABLE_GAMES, type TableGameId } from "../../../../lib/table-games";
import { ActiveOrderProvider, useActiveOrder } from "../AuroraActiveOrder";
import TabooGame from "./TabooGame";
import ReflexGame from "./ReflexGame";
import styles from "./games.module.css";

// Masa oyunları ekranı. Her şey bu telefonda, bellekte tutulur: sekme
// kapanınca ya da 30 dakika dokunulmazsa (masaya bırakılmış ortak tablet)
// oyun sıfırlanır. Sunucuya ve veritabanına oyun verisi gitmez.

const IDLE_RESET_MS = 30 * 60 * 1000;

type Screen = "home" | TableGameId;

const ORDER_TEXT: Record<string, string> = {
  pending: "Siparişiniz alındı",
  accepted: "Siparişiniz onaylandı",
  preparing: "Siparişiniz hazırlanıyor",
  ready: "Siparişiniz hazır, masanıza geliyor",
  delivered: "Siparişiniz masanızda",
};

// Oyunun üstündeki sipariş şeridi; sipariş hazır olunca bildirim gösterir.
function OrderStrip() {
  const order = useActiveOrder();
  const [notice, setNotice] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const status = order?.status ?? null;
  if (status !== lastStatus) {
    setLastStatus(status);
    // Oyun sırasında hazır/teslim durumuna geçilirse bir kez haber verilir.
    if (lastStatus && status && (status === "ready" || status === "delivered") && status !== lastStatus) {
      setNotice(status === "ready" ? "Siparişiniz masanıza geliyor!" : "Siparişiniz masanızda. Afiyet olsun!");
    }
  }

  useEffect(() => {
    if (notice) navigator.vibrate?.([200, 100, 200]);
  }, [notice]);

  if (!order) return null;

  return (
    <>
      <a className={styles.orderStrip} href={order.href}>
        <span className={order.status === "delivered" ? styles.orderDot : styles.orderPulse} aria-hidden="true" />
        <span>{ORDER_TEXT[order.status] ?? "Siparişiniz alındı"}</span>
        <small>Takip et</small>
      </a>

      {notice && (
        <div className={styles.noticeRoot} role="alertdialog" aria-labelledby="siparis-bildirim">
          <div className={styles.notice}>
            <span className={styles.noticeIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4" />
              </svg>
            </span>
            <strong id="siparis-bildirim">{notice}</strong>
            <button type="button" className={styles.primary} onClick={() => setNotice(null)}>
              Tamam
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function GameIcon({ id }: { id: TableGameId }) {
  return id === "anlat" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v10H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3 5 14h6l-1 7 8-11h-6z" />
    </svg>
  );
}

export default function GamesApp({
  slug,
  restaurantName,
  games,
  tableToken,
  homeHref,
}: {
  slug: string;
  restaurantName: string;
  games: TableGameId[];
  tableToken: string | null;
  homeHref: string;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [resetKey, setResetKey] = useState(0);
  const lastActive = useRef(0);

  // Ortak cihazda bir sonraki müşteri eski oyunu görmesin.
  useEffect(() => {
    lastActive.current = Date.now();
    const touch = () => {
      lastActive.current = Date.now();
    };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    const timer = window.setInterval(() => {
      if (Date.now() - lastActive.current > IDLE_RESET_MS) {
        setScreen("home");
        setResetKey((key) => key + 1);
        lastActive.current = Date.now();
      }
    }, 60_000);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      window.clearInterval(timer);
    };
  }, []);

  const available = TABLE_GAMES.filter((game) => games.includes(game.id));
  const exit = () => setScreen("home");

  return (
    <ActiveOrderProvider slug={slug} tableToken={tableToken}>
      <div className={styles.page}>
        <div className={styles.column}>
          <header className={styles.top}>
            {screen === "home" ? (
              <a className={styles.round} href={homeHref} aria-label="Ana sayfaya dön">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </a>
            ) : (
              <button type="button" className={styles.round} onClick={exit} aria-label="Oyunlara dön">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            )}
            <div className={styles.topText}>
              <h1>{screen === "home" ? "Masa Oyunları" : available.find((game) => game.id === screen)?.name}</h1>
              <small>{restaurantName}</small>
            </div>
          </header>

          <OrderStrip />

          {screen === "home" && (
            <>
              <p className={styles.lead}>Siparişiniz hazırlanırken masaca bir oyun açın. Uygulama yok, tek telefon yeter.</p>
              <div className={styles.gameList}>
                {available.map((game) => (
                  <button key={game.id} type="button" className={styles.gameCard} onClick={() => setScreen(game.id)}>
                    <span className={styles.gameIcon} aria-hidden="true">
                      <GameIcon id={game.id} />
                    </span>
                    <span className={styles.gameText}>
                      <strong>{game.name}</strong>
                      <span>{game.short}</span>
                      <small>{game.players} · tek telefon</small>
                    </span>
                    <span className={styles.playPill}>Oyna</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {screen === "anlat" && <TabooGame key={`anlat-${resetKey}`} onExit={exit} />}
        </div>

        {screen === "refleks" && <ReflexGame key={`refleks-${resetKey}`} onExit={exit} />}
      </div>
    </ActiveOrderProvider>
  );
}
