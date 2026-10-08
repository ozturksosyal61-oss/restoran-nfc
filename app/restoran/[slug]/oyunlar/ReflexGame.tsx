"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./games.module.css";

// En Hızlı Parmak: telefon masanın ortasında, ekran oyuncu sayısı kadar
// bölüme ayrılır. Ekran yeşile (tuzak turlarında maviye) dönünce ilk
// dokunan kazanır; erken dokunan o turda yanar.

type Status = "ready" | "wait" | "decoy" | "go" | "result";

const PLAYERS = [
  { name: "Turuncu", color: "#f08a24" },
  { name: "Turkuaz", color: "#19b3a6" },
  { name: "Pembe", color: "#e8508a" },
  { name: "Mor", color: "#8c62e8" },
];
const ROUND_OPTIONS = [3, 5, 7];
const TRAP_CHANCE = 0.35;
const RESULT_DELAY_MS = 1200;
const NO_TAP_TIMEOUT_MS = 5000;

// Rastgelelik ve zaman ölçümü yalnızca dokunma / düğme anında çağrılır.
const chance = (probability: number) => Math.random() < probability;
const between = (min: number, max: number) => min + Math.random() * (max - min);
const clock = () => performance.now();

export default function ReflexGame({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<"setup" | "playing" | "final">("setup");
  const [players, setPlayers] = useState(2);
  const [roundsTotal, setRoundsTotal] = useState(5);

  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<Status>("ready");
  const [trap, setTrap] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [burned, setBurned] = useState<boolean[]>([]);
  const [times, setTimes] = useState<(number | null)[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

  // Dokunma anında güncel durumu okumak için (zamanlayıcılar ve çoklu dokunuş).
  const live = useRef({
    status: "ready" as Status,
    burned: [] as boolean[],
    times: [] as (number | null)[],
    winner: null as number | null,
    goAt: 0,
    players: 2,
  });
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  useEffect(() => () => clearTimers(), []);

  function changeStatus(next: Status) {
    live.current.status = next;
    setStatus(next);
  }

  function finishRound() {
    if (live.current.status === "result") return;
    clearTimers();
    changeStatus("result");
  }

  function startGame() {
    live.current.players = players;
    setScores(Array(players).fill(0));
    setRound(0);
    resetRound(players);
    setPhase("playing");
  }

  function resetRound(count: number) {
    live.current.burned = Array(count).fill(false);
    live.current.times = Array(count).fill(null);
    live.current.winner = null;
    setBurned(live.current.burned);
    setTimes(live.current.times);
    setWinner(null);
    changeStatus("ready");
  }

  function startRound() {
    clearTimers();
    resetRound(live.current.players);
    // İlk tur her zaman normal; sonrasında bazı turlar tuzaklı.
    const isTrap = round > 0 && chance(TRAP_CHANCE);
    setTrap(isTrap);
    changeStatus("wait");

    const delay = between(1500, 4500);
    const go = () => {
      live.current.goAt = clock();
      changeStatus("go");
      later(finishRound, NO_TAP_TIMEOUT_MS);
    };
    if (isTrap) {
      later(() => {
        changeStatus("decoy");
        later(go, between(700, 1300));
      }, delay);
    } else {
      later(go, delay);
    }
  }

  function tap(player: number, event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const state = live.current;
    if (state.status === "wait" || state.status === "decoy") {
      if (state.burned[player]) return;
      state.burned = state.burned.map((value, index) => (index === player ? true : value));
      setBurned(state.burned);
      navigator.vibrate?.([80, 40, 80]);
      if (state.burned.every(Boolean)) finishRound();
      return;
    }
    if (state.status !== "go" || state.burned[player] || state.times[player] != null) return;

    const elapsed = Math.round(clock() - state.goAt);
    state.times = state.times.map((value, index) => (index === player ? elapsed : value));
    setTimes(state.times);

    if (state.winner == null) {
      state.winner = player;
      setWinner(player);
      setScores((current) => current.map((score, index) => (index === player ? score + 1 : score)));
      navigator.vibrate?.(120);
      later(finishRound, RESULT_DELAY_MS);
    }
    const everyone = state.times.every((value, index) => value != null || state.burned[index]);
    if (everyone) later(finishRound, 300);
  }

  function nextRound() {
    if (round + 1 >= roundsTotal) {
      clearTimers();
      setPhase("final");
      return;
    }
    setRound((value) => value + 1);
    resetRound(live.current.players);
  }

  /* ---------------- Kurulum ---------------- */

  if (phase === "setup") {
    return (
      <div className={styles.reflexRoot}>
        <section className={`${styles.panel} ${styles.reflexSetup}`} aria-labelledby="refleks-kurulum">
          <h2 id="refleks-kurulum" className={styles.panelTitle}>
            En Hızlı Parmak
          </h2>
          <ol className={styles.rules}>
            <li>Telefonu masanın ortasına koyun, herkes kendi renginin önüne geçsin.</li>
            <li>Ekran kırmızıyken bekleyin. Yeşile dönünce ilk dokunan turu kazanır.</li>
            <li>Erken dokunan yanar! Bazı turlarda yeşil tuzaktır: “MAVİDE dokun” yazıyorsa maviyi bekleyin.</li>
          </ol>

          <div className={styles.field}>
            <span className={styles.label}>Kaç kişi oynuyor?</span>
            <div className={styles.seg}>
              {[2, 3, 4].map((count) => (
                <button key={count} type="button" className={players === count ? styles.segOn : ""} onClick={() => setPlayers(count)}>
                  {count} kişi
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Kaç tur?</span>
            <div className={styles.seg}>
              {ROUND_OPTIONS.map((count) => (
                <button key={count} type="button" className={roundsTotal === count ? styles.segOn : ""} onClick={() => setRoundsTotal(count)}>
                  {count} tur
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <button type="button" className={styles.primary} onClick={startGame}>
              Başlat
            </button>
            <button type="button" className={styles.secondary} onClick={onExit}>
              Vazgeç
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* ---------------- Oyun sonu ---------------- */

  if (phase === "final") {
    const best = Math.max(...scores);
    const champions = scores.map((score, index) => (score === best ? index : -1)).filter((index) => index >= 0);
    return (
      <div className={styles.reflexRoot}>
        <section className={`${styles.panel} ${styles.center} ${styles.reflexSetup}`} aria-live="polite">
          <span className={styles.trophy} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" />
            </svg>
          </span>
          <h2 className={styles.bigTitle}>
            {best === 0
              ? "Kimse kazanamadı!"
              : champions.length > 1
                ? `Berabere: ${champions.map((index) => PLAYERS[index].name).join(" ve ")}`
                : `Şampiyon: ${PLAYERS[champions[0]].name}`}
          </h2>
          <div className={styles.scoreboard}>
            {scores.map((score, index) => (
              <div key={index} style={{ borderColor: PLAYERS[index].color }}>
                <span>
                  <i className={styles.swatch} style={{ background: PLAYERS[index].color }} /> {PLAYERS[index].name}
                </span>
                <b>{score}</b>
              </div>
            ))}
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.primary} onClick={startGame}>
              Tekrar oyna
            </button>
            <button type="button" className={styles.secondary} onClick={onExit}>
              Oyunlara dön
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* ---------------- Oyun ---------------- */

  const fieldColor =
    status === "wait"
      ? styles.zoneWait
      : status === "decoy"
        ? styles.zoneGreen
        : status === "go"
          ? trap
            ? styles.zoneBlue
            : styles.zoneGreen
          : "";

  function zoneText(player: number) {
    if (burned[player]) return { big: "Yandın!", small: "Erken dokundun" };
    if (status === "ready") return { big: PLAYERS[player].name, small: "Parmağını hazırla" };
    if (status === "wait" || status === "decoy") return trap ? { big: "MAVİDE dokun!", small: "Yeşil tuzak" } : { big: "Bekle…", small: "Yeşili bekle" };
    if (status === "go") return times[player] != null ? { big: `${times[player]} ms`, small: winner === player ? "İlk sen!" : "" } : { big: "DOKUN!", small: "" };
    // Sonuç
    if (winner === player) return { big: "Kazandın!", small: `${times[player]} ms` };
    return { big: times[player] != null ? `${times[player]} ms` : "—", small: "" };
  }

  const roundOver = status === "result" || status === "ready";

  return (
    <div className={`${styles.reflexRoot} ${styles.reflexBoard} ${styles[`players${players}`]}`}>
      {Array.from({ length: players }, (_, player) => {
        const text = zoneText(player);
        const flipped = players === 2 ? player === 0 : players === 3 ? player === 0 : player < 2;
        return (
          <div
            key={player}
            className={`${styles.zone} ${fieldColor} ${burned[player] ? styles.zoneBurned : ""} ${status === "result" && winner === player ? styles.zoneWinner : ""}`}
            style={{ borderColor: PLAYERS[player].color }}
            onPointerDown={(event) => tap(player, event)}
            role="button"
            aria-label={`${PLAYERS[player].name} oyuncunun alanı`}
          >
            <div className={`${styles.zoneInner} ${flipped ? styles.flipped : ""}`}>
              <span className={styles.zoneTag} style={{ background: PLAYERS[player].color }}>
                {PLAYERS[player].name} · {scores[player] ?? 0}
              </span>
              <strong>{text.big}</strong>
              {text.small && <small>{text.small}</small>}
            </div>
          </div>
        );
      })}

      {roundOver && (
        <div className={styles.reflexCenter}>
          <span className={styles.kicker}>
            Tur {round + 1} / {roundsTotal}
          </span>
          {status === "result" && (
            <strong>
              {winner != null ? `${PLAYERS[winner].name} kazandı` : burned.every(Boolean) ? "Herkes yandı!" : "Kimse dokunmadı"}
            </strong>
          )}
          {status === "ready" ? (
            <button type="button" className={styles.primary} onClick={startRound}>
              Turu başlat
            </button>
          ) : (
            <button type="button" className={styles.primary} onClick={nextRound}>
              {round + 1 >= roundsTotal ? "Sonuçlar" : "Sonraki tur"}
            </button>
          )}
          <button type="button" className={styles.linkButton} onClick={onExit}>
            Oyundan çık
          </button>
        </div>
      )}
    </div>
  );
}
