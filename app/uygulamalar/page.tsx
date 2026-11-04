import Link from "next/link";
import SiteFooter from "../SiteFooter";
import { siteFontClass } from "../site-fonts";
import { pageMetadata, SHARE_IMAGE_ALT } from "../../lib/site";
import { supabase } from "../../lib/supabase";
import { APP_COLUMNS, appImageUrl, type AppEntry } from "../../lib/apps";
import AppImage from "./AppImage";
import Reveal from "./Reveal";
import styles from "./uygulamalar.module.css";

// Panelden kaydedince revalidatePath ile anında, aksi halde saatlik tazelenir.
export const revalidate = 3600;

const DESCRIPTION =
  "OZT Digital'in mobil uygulamaları: yapay zekayla kalori ve makro takibi yapan Kürdan ve 1920'ler İstanbul meyhanesinde geçen online blöf oyunu Bluff House.";

const base = pageMetadata({
  path: "/uygulamalar",
  title: "Uygulamalarımız – Mobil Uygulamalar | OZT Digital",
  absoluteTitle: true,
  description: DESCRIPTION,
});
const shareImages = [{ url: "/uygulamalar/opengraph-image", width: 1200, height: 630, alt: SHARE_IMAGE_ALT }];

export const metadata = {
  ...base,
  openGraph: { ...base.openGraph, images: shareImages },
  twitter: { ...base.twitter, images: shareImages },
};

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.600-2.800-1.800-3.400-1.800-1.400-.1-2.800.9-3.500.9s-1.800-.8-3-.8c-1.500 0-3 .9-3.800 2.300-1.600 2.800-.4 7 1.200 9.300.8 1.100 1.700 2.400 2.900 2.300 1.200 0 1.600-.7 3-.7s1.800.7 3 .7c1.300 0 2.100-1.100 2.800-2.200.9-1.300 1.300-2.500 1.300-2.600-.1 0-2.500-1-2.500-3.900zM14.100 5.700c.6-.8 1.100-1.900.9-3-.9 0-2.100.6-2.700 1.400-.6.700-1.100 1.800-1 2.900 1.100.1 2.200-.5 2.800-1.300z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M4 2.600v18.800c0 .4.400.600.700.400L20.600 12 4.700 2.200c-.3-.2-.7 0-.7.400z" />
    </svg>
  );
}

function StoreButton({ href, kind, appName }: { href: string | null; kind: "apple" | "play"; appName: string }) {
  if (!href) return null;
  const label = kind === "apple" ? "App Store" : "Google Play";
  const small = kind === "apple" ? "Download on the" : "GET IT ON";
  return (
    <a className={styles.store} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${appName} – ${label} üzerinden indir`}>
      {kind === "apple" ? <AppleIcon /> : <PlayIcon />}
      <span className={styles.storeText}>
        <small>{small}</small>
        <strong>{label}</strong>
      </span>
    </a>
  );
}

function AppCard({ app, flip }: { app: AppEntry; flip: boolean }) {
  const soon = app.status === "yakinda";
  const beta = app.status === "beta";
  const hasStore = !!(app.app_store_url || app.play_store_url);
  const iconSrc = app.icon_path ? appImageUrl(app.icon_path) : "";
  const shots = app.screenshots.map(appImageUrl);
  return (
    <Reveal>
      <article
        id={app.slug}
        className={`${styles.card} ${flip ? styles.flip : ""}`}
        style={{ "--accent": app.accent_color } as React.CSSProperties}
      >
        <div className={styles.copy}>
          <div className={styles.head}>
            <div className={styles.icon}>
              <AppImage
                src={iconSrc}
                alt={`${app.name} uygulama ikonu`}
                fallback={<span className={styles.initial}>{app.name[0]}</span>}
              />
            </div>
            <div>
              <h2>{app.name}</h2>
              <p className={styles.tagline}>{app.tagline}</p>
            </div>
          </div>

          <div className={styles.badges}>
            {soon && <span className={styles.pill}>Çok yakında</span>}
            {beta && <span className={`${styles.pill} ${styles.pillBeta}`}>Beta</span>}
            {!soon && !beta && <span className={`${styles.pill} ${styles.pillLive}`}>Yayında</span>}
          </div>

          <p className={styles.desc}>{app.description}</p>

          {soon ? (
            <span className={styles.soon}>Çok yakında</span>
          ) : (
            hasStore && (
              <div className={styles.stores}>
                <StoreButton href={app.app_store_url} kind="apple" appName={app.name} />
                <StoreButton href={app.play_store_url} kind="play" appName={app.name} />
              </div>
            )
          )}
          {(app.privacy_url || app.support_url) && (
            <p className={styles.links}>
              {app.privacy_url && <a href={app.privacy_url} target="_blank" rel="noopener noreferrer">Gizlilik</a>}
              {app.support_url && <a href={app.support_url} target="_blank" rel="noopener noreferrer">Destek</a>}
            </p>
          )}
        </div>

        <div className={styles.shots}>
          <div className={styles.phone}>
            <div className={styles.screen}>
              <AppImage
                src={shots[0] ?? ""}
                alt={`${app.name} ekran görüntüsü`}
                fallback={
                  <>
                    <span className={styles.initial}>{app.name[0]}</span>
                    <span className={styles.phName}>{app.name}</span>
                  </>
                }
              />
            </div>
          </div>
          {shots[1] && (
            <div className={`${styles.phone} ${styles.phoneSecond}`} aria-hidden="true">
              <div className={styles.screen}>
                <AppImage src={shots[1]} alt="" fallback={<span className={styles.initial}>{app.name[0]}</span>} />
              </div>
            </div>
          )}
        </div>
      </article>
    </Reveal>
  );
}

export default async function UygulamalarPage() {
  const { data } = await supabase.from("apps").select(APP_COLUMNS).order("sort_order").order("created_at");
  const apps = (data ?? []) as AppEntry[];

  return (
    <main className={`${siteFontClass} ${styles.page}`}>
      <header className={styles.hero}>
        <Link href="/" className={styles.brand} aria-label="OZT Digital ana sayfa">
          <span className={styles.brandMark}>OZT</span>
          <span>Digital</span>
        </Link>
        <h1>
          OZT Digital <em>Uygulamaları</em>
        </h1>
        <p>Telefonunuzda yer açın: yapay zekâlı, akıllı ve eğlenceli mobil uygulamalarımız.</p>
      </header>

      <div className={styles.list}>
        {apps.length === 0 && <p className={styles.empty}>Uygulamalar yakında burada.</p>}
        {apps.map((app, i) => (
          <AppCard key={app.id} app={app} flip={i % 2 === 1} />
        ))}
      </div>

      <SiteFooter />
    </main>
  );
}
