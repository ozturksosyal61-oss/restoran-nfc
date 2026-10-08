"use client";

import { useEffect, useRef, useState } from "react";
import { TABOO_CARDS, shuffle, type TabooCard } from "./words";
import styles from "./games.module.css";

// Anlat Bakalım: telefonu tutan kişi kelimeyi yasaklı kelimeleri
// kullanmadan anlatır. 2 kişi birlikte (masanın puanı) ya da iki takım.

type Mode = "coop" | "teams";
type Phase = "setup" | "intro" | "play" | "summary" | "final";
type TurnStats = { correct: number; taboo: number; pass: number };

const DURATIONS = [45, 60, 90];
const ROUNDS = [3, 5, 7];
const PASSES_PER_TURN = 3;

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancelled) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

export default function TabooGame({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<Mode>("teams");
  const [teamNames, setTeamNames] = useState(["Takım 1", "Takım 2"]);
  const [seconds, setSeconds] = useState(60);
  const [rounds, setRounds] = useState(3);

  const [deck, setDeck] = useState<TabooCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [stats, setStats] = useState<TurnStats>({ correct: 0, taboo: 0, pass: 0 });
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const endAt = useRef(0);
  const pausedLeft = useRef(0);

  const teams = mode === "teams" ? 2 : 1;
  const totalTurns = rounds * teams;
  const team = turn % teams;
  const card = deck[cardIndex % Math.max(deck.length, 1)];
  const passesLeft = PASSES_PER_TURN - stats.pass;

  useWakeLock(phase === "play");

  // Süre sayacı (bitiş zamanına göre; sekme arkaya düşse de doğru kalır).
  useEffect(() => {
    if (phase !== "play" || paused) return;
    const tick = () => {
      const left = Math.max(0, endAt.current - Date.now());
      setRemaining(left);
      if (left <= 0) {
        navigator.vibrate?.([300, 120, 300]);
        setPhase("summary");
      }
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [phase, paused]);

  function startGame() {
    setDeck(shuffle(TABOO_CARDS));
    setCardIndex(0);
    setTurn(0);
    setScores([0, 0]);
    setPhase("intro");
  }

  function startTurn() {
    setStats({ correct: 0, taboo: 0, pass: 0 });
    setPaused(false);
    endAt.current = Date.now() + seconds * 1000;
    setRemaining(seconds * 1000);
    setPhase("play");
  }

  // 300 kartlık deste bir oyunda bitmez; biterse baştan döner.
  function nextCard() {
    setCardIndex((index) => index + 1);
  }

  function mark(kind: "correct" | "taboo" | "pass") {
    if (kind === "pass" && passesLeft <= 0) return;
    setStats((current) => ({ ...current, [kind]: current[kind] + 1 }));
    if (kind !== "pass") {
      setScores((current) => current.map((score, index) => (index === team ? score + (kind === "correct" ? 1 : -1) : score)));
    }
    navigator.vibrate?.(kind === "correct" ? 30 : kind === "taboo" ? [60, 40, 60] : 15);
    nextCard();
  }

  function togglePause() {
    if (paused) {
      endAt.current = Date.now() + pausedLeft.current;
      setPaused(false);
    } else {
      pausedLeft.current = Math.max(0, endAt.current - Date.now());
      setPaused(true);
    }
  }

  function afterSummary() {
    // Son tur kartı bir dahaki tura geçmesin.
    nextCard();
    if (turn + 1 >= totalTurns) {
      setPhase("final");
    } else {
      setTurn((value) => value + 1);
      setPhase("intro");
    }
  }

  /* ---------------- Kurulum ---------------- */

  if (phase === "setup") {
    return (
      <section className={styles.panel} aria-labelledby="anlat-kurulum">
        <h2 id="anlat-kurulum" className={styles.panelTitle}>
          Nasıl oynanır?
        </h2>
        <ol className={styles.rules}>
          <li>Telefonu tutan kişi ekrandaki kelimeyi anlatır, diğerleri tahmin eder.</li>
          <li>Altındaki yasaklı kelimeleri söylemek yok. Söylerseniz puan kaybedersiniz.</li>
          <li>Süre bitince telefon titrer ve sıra diğer takıma geçer.</li>
        </ol>

        <div className={styles.field}>
          <span className={styles.label}>Kaç kişisiniz?</span>
          <div className={styles.seg}>
            <button type="button" className={mode === "coop" ? styles.segOn : ""} onClick={() => setMode("coop")}>
              2 kişi · birlikte
            </button>
            <button type="button" className={mode === "teams" ? styles.segOn : ""} onClick={() => setMode("teams")}>
              3+ kişi · iki takım
            </button>
          </div>
        </div>

        {mode === "teams" && (
          <div className={styles.teamInputs}>
            {teamNames.map((name, index) => (
              <label key={index} className={styles.field}>
                <span className={styles.label}>{index + 1}. takımın adı</span>
                <input
                  className={styles.input}
                  value={name}
                  maxLength={20}
                  onChange={(event) =>
                    setTeamNames((current) => current.map((item, i) => (i === index ? event.target.value : item)))
                  }
                />
              </label>
            ))}
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label}>Tur süresi</span>
          <div className={styles.seg}>
            {DURATIONS.map((value) => (
              <button key={value} type="button" className={seconds === value ? styles.segOn : ""} onClick={() => setSeconds(value)}>
                {value} sn
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{mode === "teams" ? "Her takım kaç tur oynasın?" : "Kaç tur oynayalım?"}</span>
          <div className={styles.seg}>
            {ROUNDS.map((value) => (
              <button key={value} type="button" className={rounds === value ? styles.segOn : ""} onClick={() => setRounds(value)}>
                {value} tur
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.primary} onClick={startGame}>
          Oyunu başlat
        </button>
      </section>
    );
  }

  const teamLabel = (index: number) => teamNames[index]?.trim() || `Takım ${index + 1}`;

  /* ---------------- Tur başı ---------------- */

  if (phase === "intro") {
    return (
      <section className={`${styles.panel} ${styles.center}`} aria-live="polite">
        <span className={styles.kicker}>
          Tur {Math.floor(turn / teams) + 1} / {rounds}
        </span>
        <h2 className={styles.bigTitle}>{mode === "teams" ? `Sıra: ${teamLabel(team)}` : "Hazır mısınız?"}</h2>
        <p className={styles.muted}>Telefonu anlatacak kişiye verin. Ekranı diğerlerinden gizleyin.</p>
        {mode === "teams" && <Scoreboard names={[teamLabel(0), teamLabel(1)]} scores={scores} />}
        <button type="button" className={styles.primary} onClick={startTurn}>
          Başla · {seconds} sn
        </button>
      </section>
    );
  }

  /* ---------------- Oyun ---------------- */

  if (phase === "play" && card) {
    const fraction = remaining / (seconds * 1000);
    const lastSeconds = remaining <= 10_000;
    return (
      <section className={styles.play} aria-label="Anlat Bakalım">
        <div className={styles.timerRow}>
          <span className={`${styles.timer} ${lastSeconds ? styles.timerLow : ""}`} aria-live="off">
            {Math.ceil(remaining / 1000)}
          </span>
          <span className={styles.timerTrack} aria-hidden="true">
            <span className={styles.timerFill} style={{ width: `${fraction * 100}%` }} />
          </span>
          <button type="button" className={styles.ghost} onClick={togglePause}>
            {paused ? "Devam" : "Durdur"}
          </button>
        </div>

        <div className={`${styles.wordCard} ${paused ? styles.wordHidden : ""}`}>
          <span className={styles.kicker}>{card.category}</span>
          <strong className={styles.word}>{paused ? "Durduruldu" : card.word}</strong>
          {!paused && (
            <>
              <span className={styles.tabooLabel}>Yasaklı kelimeler</span>
              <ul className={styles.tabooList}>
                {card.taboo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={styles.playButtons}>
          <button type="button" className={styles.btnTaboo} onClick={() => mark("taboo")} disabled={paused}>
            <b>Yasak</b>
            <small>−1</small>
          </button>
          <button type="button" className={styles.btnPass} onClick={() => mark("pass")} disabled={paused || passesLeft <= 0}>
            <b>Pas</b>
            <small>{passesLeft} hak</small>
          </button>
          <button type="button" className={styles.btnCorrect} onClick={() => mark("correct")} disabled={paused}>
            <b>Bildi</b>
            <small>+1</small>
          </button>
        </div>

        <p className={styles.turnLine}>
          {mode === "teams" ? teamLabel(team) : "Masanın puanı"}: <b>{scores[team]}</b> · Bu tur {stats.correct} doğru
        </p>
      </section>
    );
  }

  /* ---------------- Tur sonu ---------------- */

  if (phase === "summary") {
    const turnScore = stats.correct - stats.taboo;
    return (
      <section className={`${styles.panel} ${styles.center}`} aria-live="polite">
        <span className={styles.kicker}>Süre doldu</span>
        <h2 className={styles.bigTitle}>
          {mode === "teams" ? `${teamLabel(team)}: ${turnScore >= 0 ? "+" : ""}${turnScore}` : `Bu tur ${turnScore >= 0 ? "+" : ""}${turnScore}`}
        </h2>
        <dl className={styles.stats}>
          <div>
            <dt>Doğru</dt>
            <dd>{stats.correct}</dd>
          </div>
          <div>
            <dt>Yasak</dt>
            <dd>{stats.taboo}</dd>
          </div>
          <div>
            <dt>Pas</dt>
            <dd>{stats.pass}</dd>
          </div>
        </dl>
        {mode === "teams" ? (
          <Scoreboard names={[teamLabel(0), teamLabel(1)]} scores={scores} />
        ) : (
          <p className={styles.muted}>Toplam puanınız: {scores[0]}</p>
        )}
        <button type="button" className={styles.primary} onClick={afterSummary}>
          {turn + 1 >= totalTurns ? "Sonuçları gör" : mode === "teams" ? `Sıra ${teamLabel((team + 1) % teams)}` : "Sonraki tur"}
        </button>
      </section>
    );
  }

  /* ---------------- Oyun sonu ---------------- */

  const winner = mode === "teams" ? (scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1) : null;
  return (
    <section className={`${styles.panel} ${styles.center}`} aria-live="polite">
      <span className={styles.trophy} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" />
        </svg>
      </span>
      <h2 className={styles.bigTitle}>
        {mode === "coop" ? `Masanın puanı: ${scores[0]}` : winner === null ? "Berabere!" : `${teamLabel(winner)} kazandı!`}
      </h2>
      {mode === "teams" && <Scoreboard names={[teamLabel(0), teamLabel(1)]} scores={scores} />}
      <div className={styles.row}>
        <button type="button" className={styles.primary} onClick={startGame}>
          Tekrar oyna
        </button>
        <button type="button" className={styles.secondary} onClick={onExit}>
          Oyunlara dön
        </button>
      </div>
    </section>
  );
}

function Scoreboard({ names, scores }: { names: string[]; scores: number[] }) {
  return (
    <div className={styles.scoreboard}>
      {names.map((name, index) => (
        <div key={index}>
          <span>{name}</span>
          <b>{scores[index]}</b>
        </div>
      ))}
    </div>
  );
}
