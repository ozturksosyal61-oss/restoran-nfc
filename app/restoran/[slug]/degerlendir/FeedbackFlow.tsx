"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { isRtl, type DisplayLanguage } from "../../../../lib/menu-i18n";
import AuroraIcon from "../AuroraIcon";
import styles from "../AuroraFlow.module.css";

// Menüde seçilen dil (varsa) burada da kullanılır.
const LANGUAGE_STORAGE_KEY = "ozt_menu_language";

const TEXT = {
  tr: {
    title: "Bizi değerlendirin",
    intro: "Deneyiminizi bir dakikada puanlayın.",
    question: "Bugünkü deneyiminiz nasıldı?",
    labels: ["", "Çok kötü", "Kötü", "Ortalama", "Çok iyi", "Mükemmel"],
    star: (n: number) => `${n} yıldız`,
    happyTitle: "Çok sevindik!",
    happyGoogle:
      "Bu deneyimi Google'da paylaşırsanız başka misafirlere de yol göstermiş olursunuz. Yorumunuz bizim için çok değerli.",
    googleCta: "Google'da yorum yaz",
    noteInstead: "Yalnızca işletmeye not bırak",
    happyNote: "İsterseniz bize kısa bir not bırakın.",
    sorryTitle: "Bunu duyduğumuza üzüldük",
    sorryText: "Ne yaşandığını anlatır mısınız? Mesajınızı doğrudan işletme yöneticisi okur.",
    comment: "Mesajınız",
    commentPlaceholder: "Ne iyi gitti, ne daha iyi olabilirdi?",
    contact: "Size dönmemizi isterseniz adınız ve telefonunuz",
    contactPlaceholder: "Örn. Ayşe · 0555 000 00 00",
    optional: "isteğe bağlı",
    send: "Gönder",
    sending: "Gönderiliyor…",
    thanksTitle: "Teşekkür ederiz",
    thanksText: "Geri bildiriminiz işletmeye iletildi.",
    googleAlso: "Google'da da yorum yazabilirsiniz",
    rateStaff: "Bir çalışanımızı değerlendirin",
    backToMenu: "Menüye dön",
    back: "Geri dön",
    error: "Gönderilemedi. Lütfen tekrar deneyin.",
  },
  en: {
    title: "Rate us",
    intro: "Rate your visit in under a minute.",
    question: "How was your experience today?",
    labels: ["", "Very poor", "Poor", "Okay", "Very good", "Excellent"],
    star: (n: number) => `${n} ${n === 1 ? "star" : "stars"}`,
    happyTitle: "We're so glad!",
    happyGoogle: "Sharing your experience on Google helps other guests find us. Your review means a lot to us.",
    googleCta: "Write a Google review",
    noteInstead: "Leave a note for the venue only",
    happyNote: "Feel free to leave us a short note.",
    sorryTitle: "We're sorry to hear that",
    sorryText: "Could you tell us what happened? Your message goes straight to the manager.",
    comment: "Your message",
    commentPlaceholder: "What went well, and what could be better?",
    contact: "Your name and phone, if you'd like us to get back to you",
    contactPlaceholder: "e.g. Anna · +44 7700 900000",
    optional: "optional",
    send: "Send",
    sending: "Sending…",
    thanksTitle: "Thank you",
    thanksText: "Your feedback has been sent to the venue.",
    googleAlso: "You can also write a review on Google",
    rateStaff: "Rate a member of our staff",
    backToMenu: "Back to menu",
    back: "Go back",
    error: "Could not send. Please try again.",
  },
  de: {
    title: "Bewerten Sie uns",
    intro: "Bewerten Sie Ihren Besuch in einer Minute.",
    question: "Wie war Ihr Besuch heute?",
    labels: ["", "Sehr schlecht", "Schlecht", "Okay", "Sehr gut", "Ausgezeichnet"],
    star: (n: number) => `${n} ${n === 1 ? "Stern" : "Sterne"}`,
    happyTitle: "Das freut uns sehr!",
    happyGoogle:
      "Wenn Sie Ihre Erfahrung auf Google teilen, hilft das anderen Gästen. Ihre Bewertung bedeutet uns viel.",
    googleCta: "Auf Google bewerten",
    noteInstead: "Nur dem Betrieb eine Nachricht senden",
    happyNote: "Hinterlassen Sie uns gerne eine kurze Nachricht.",
    sorryTitle: "Das tut uns leid",
    sorryText: "Erzählen Sie uns, was passiert ist? Ihre Nachricht geht direkt an die Leitung.",
    comment: "Ihre Nachricht",
    commentPlaceholder: "Was war gut, was könnte besser sein?",
    contact: "Name und Telefon, falls wir uns melden sollen",
    contactPlaceholder: "z. B. Anna · +49 151 0000000",
    optional: "optional",
    send: "Senden",
    sending: "Wird gesendet…",
    thanksTitle: "Vielen Dank",
    thanksText: "Ihr Feedback wurde an den Betrieb gesendet.",
    googleAlso: "Sie können uns auch auf Google bewerten",
    rateStaff: "Mitarbeiter bewerten",
    backToMenu: "Zurück zur Speisekarte",
    back: "Zurück",
    error: "Senden fehlgeschlagen. Bitte erneut versuchen.",
  },
  ru: {
    title: "Оцените нас",
    intro: "Оцените визит за минуту.",
    question: "Как вам у нас сегодня?",
    labels: ["", "Очень плохо", "Плохо", "Нормально", "Очень хорошо", "Отлично"],
    star: (n: number) => `${n} из 5`,
    happyTitle: "Мы очень рады!",
    happyGoogle: "Отзыв в Google поможет другим гостям найти нас. Ваше мнение очень важно для нас.",
    googleCta: "Оставить отзыв в Google",
    noteInstead: "Написать только заведению",
    happyNote: "Можете оставить нам короткое сообщение.",
    sorryTitle: "Нам очень жаль",
    sorryText: "Расскажите, что случилось? Ваше сообщение прочитает управляющий.",
    comment: "Ваше сообщение",
    commentPlaceholder: "Что понравилось, а что можно улучшить?",
    contact: "Имя и телефон, если хотите, чтобы мы связались с вами",
    contactPlaceholder: "Например, Анна · +7 900 000 00 00",
    optional: "необязательно",
    send: "Отправить",
    sending: "Отправка…",
    thanksTitle: "Спасибо",
    thanksText: "Ваш отзыв передан заведению.",
    googleAlso: "Вы также можете оставить отзыв в Google",
    rateStaff: "Оценить сотрудника",
    backToMenu: "Вернуться в меню",
    back: "Назад",
    error: "Не удалось отправить. Попробуйте ещё раз.",
  },
  ar: {
    title: "قيّمنا",
    intro: "قيّم زيارتك في دقيقة واحدة.",
    question: "كيف كانت تجربتك اليوم؟",
    labels: ["", "سيئة جدًا", "سيئة", "مقبولة", "جيدة جدًا", "ممتازة"],
    star: (n: number) => `${n} من 5`,
    happyTitle: "يسعدنا ذلك كثيرًا!",
    happyGoogle: "مشاركة تجربتك على Google تساعد الضيوف الآخرين. رأيك يعني لنا الكثير.",
    googleCta: "اكتب تقييمًا على Google",
    noteInstead: "أرسل ملاحظة إلى المطعم فقط",
    happyNote: "يمكنك ترك ملاحظة قصيرة لنا.",
    sorryTitle: "نأسف لسماع ذلك",
    sorryText: "هل تخبرنا بما حدث؟ تصل رسالتك مباشرة إلى المدير.",
    comment: "رسالتك",
    commentPlaceholder: "ما الذي أعجبك، وما الذي يمكن تحسينه؟",
    contact: "اسمك ورقم هاتفك إذا أردت أن نتواصل معك",
    contactPlaceholder: "مثال: أحمد · ‎+90 555 000 00 00",
    optional: "اختياري",
    send: "إرسال",
    sending: "جارٍ الإرسال…",
    thanksTitle: "شكرًا لك",
    thanksText: "تم إرسال ملاحظتك إلى المطعم.",
    googleAlso: "يمكنك أيضًا كتابة تقييم على Google",
    rateStaff: "قيّم أحد موظفينا",
    backToMenu: "العودة إلى القائمة",
    back: "رجوع",
    error: "تعذّر الإرسال. حاول مرة أخرى.",
  },
  fr: {
    title: "Donnez votre avis",
    intro: "Notez votre visite en une minute.",
    question: "Comment s’est passée votre visite aujourd’hui ?",
    labels: ["", "Très mauvais", "Mauvais", "Correct", "Très bien", "Excellent"],
    star: (n: number) => `${n} ${n === 1 ? "étoile" : "étoiles"}`,
    happyTitle: "Nous en sommes ravis !",
    happyGoogle:
      "Partager votre expérience sur Google aide d’autres clients à nous trouver. Votre avis compte beaucoup pour nous.",
    googleCta: "Laisser un avis Google",
    noteInstead: "Laisser un mot à l’établissement seulement",
    happyNote: "N’hésitez pas à nous laisser un petit mot.",
    sorryTitle: "Nous en sommes désolés",
    sorryText: "Pouvez-vous nous dire ce qui s’est passé ? Votre message est lu directement par le responsable.",
    comment: "Votre message",
    commentPlaceholder: "Qu’est-ce qui vous a plu, qu’est-ce qui pourrait être mieux ?",
    contact: "Votre nom et téléphone, si vous souhaitez être recontacté",
    contactPlaceholder: "ex. Claire · +33 6 00 00 00 00",
    optional: "facultatif",
    send: "Envoyer",
    sending: "Envoi…",
    thanksTitle: "Merci",
    thanksText: "Votre avis a été transmis à l’établissement.",
    googleAlso: "Vous pouvez aussi laisser un avis sur Google",
    rateStaff: "Évaluer un membre de l’équipe",
    backToMenu: "Retour au menu",
    back: "Retour",
    error: "Envoi impossible. Veuillez réessayer.",
  },
} satisfies Record<DisplayLanguage, unknown>;

const noopSubscribe = () => () => {};

function readSavedLanguage(): DisplayLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && Object.hasOwn(TEXT, saved)) return saved as DisplayLanguage;
  } catch {
    // Tarayıcı depolaması kapalı olabilir.
  }
  return "tr";
}

function initialOf(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase("tr-TR");
}

export default function FeedbackFlow({
  slug,
  name,
  logoUrl,
  googleUrl,
  menuOnly,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  googleUrl: string | null;
  menuOnly: boolean;
}) {
  // Menüde seçilen dil; sunucuda bilinmediği için tarayıcıda okunur.
  const language = useSyncExternalStore(noopSubscribe, readSavedLanguage, () => "tr" as DisplayLanguage);
  const [rating, setRating] = useState(0);
  const [writeNote, setWriteNote] = useState(false);
  const [comment, setComment] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const t = TEXT[language];
  const base = `/restoran/${encodeURIComponent(slug)}`;
  const backHref = menuOnly ? `${base}/menu` : base;
  const happy = rating >= 4;

  async function submit(wentToGoogle: boolean) {
    if (sending || rating === 0) return false;
    setSending(true);
    setError("");

    const { error: rpcError } = await createClient().rpc("submit_customer_feedback", {
      p_slug: slug,
      p_rating: rating,
      p_comment: comment.trim() || null,
      p_contact: contact.trim() || null,
      p_went_to_google: wentToGoogle,
    });

    setSending(false);

    if (rpcError) {
      console.error("Geri bildirim gönderilemedi:", rpcError);
      setError(t.error);
      return false;
    }
    return true;
  }

  function goToGoogle() {
    // Google yeni sekmede açılır; puan arka planda kaydedilir.
    void submit(true).then((ok) => {
      if (ok) setDone(true);
    });
  }

  async function sendNote() {
    if (await submit(false)) setDone(true);
  }

  const header = (
    <header className={styles.top}>
      <a className={styles.round} href={backHref} aria-label={t.back}>
        <AuroraIcon name="back" />
      </a>
      <h1>{t.title}</h1>
    </header>
  );

  const noteFields = (
    <>
      <div className={styles.field}>
        <label htmlFor="geri-bildirim-mesaj">
          {t.comment} {happy && <em>· {t.optional}</em>}
        </label>
        <textarea
          id="geri-bildirim-mesaj"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t.commentPlaceholder}
          rows={4}
          maxLength={1000}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="geri-bildirim-iletisim">
          {t.contact} <em>· {t.optional}</em>
        </label>
        <input
          id="geri-bildirim-iletisim"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder={t.contactPlaceholder}
          maxLength={120}
          autoComplete="off"
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          <AuroraIcon name="alert" size={16} />
          {error}
        </p>
      )}
      <button
        type="button"
        className={styles.cta}
        onClick={sendNote}
        disabled={sending || (!happy && !comment.trim())}
      >
        {sending ? t.sending : t.send}
      </button>
    </>
  );

  return (
    <div className={styles.page} lang={language} dir={isRtl(language) ? "rtl" : "ltr"}>
      <div className={styles.column}>
        {header}

        {done ? (
          <section className={styles.block}>
            <div className={styles.reviewDone} role="status">
              <span className={styles.stateIcon}>
                <AuroraIcon name="check" />
              </span>
              <strong>{t.thanksTitle}</strong>
              <span>{t.thanksText}</span>
            </div>
            {!menuOnly && (
              <a className={styles.ghost} href={`${base}/calisan`}>
                <AuroraIcon name="star" size={16} />
                {t.rateStaff}
              </a>
            )}
            <a className={styles.ghost} href={backHref}>
              {menuOnly ? t.backToMenu : t.back}
            </a>
          </section>
        ) : (
          <>
            <div className={styles.intro}>
              <span className={styles.introLogo}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" />
                ) : (
                  initialOf(name)
                )}
              </span>
              <span>
                <strong>{name}</strong>
                <p>{t.intro}</p>
              </span>
            </div>

            <section className={styles.block} aria-labelledby="puan-sorusu">
              <h2 id="puan-sorusu" className={styles.blockTitle}>
                {t.question}
              </h2>
              <div className={styles.stars} role="radiogroup" aria-labelledby="puan-sorusu">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={t.star(star)}
                    className={star <= rating ? styles.starOn : styles.star}
                    onClick={() => {
                      setRating(star);
                      setError("");
                    }}
                  >
                    <AuroraIcon name="star" size={30} strokeWidth={1.6} />
                  </button>
                ))}
                {rating > 0 && <span className={styles.ratingLabel}>{t.labels[rating]}</span>}
              </div>
            </section>

            {rating > 0 && happy && (
              <section className={styles.block} aria-live="polite">
                <strong className={styles.blockTitle}>{t.happyTitle}</strong>
                {googleUrl && !writeNote ? (
                  <>
                    <p className={styles.muted}>{t.happyGoogle}</p>
                    {error && (
                      <p className={styles.error} role="alert">
                        <AuroraIcon name="alert" size={16} />
                        {error}
                      </p>
                    )}
                    <a
                      className={styles.cta}
                      href={googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={goToGoogle}
                    >
                      <AuroraIcon name="star" />
                      {t.googleCta}
                    </a>
                    <button type="button" className={styles.ghost} onClick={() => setWriteNote(true)}>
                      {t.noteInstead}
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.muted}>{t.happyNote}</p>
                    {noteFields}
                  </>
                )}
              </section>
            )}

            {rating > 0 && !happy && (
              <section className={styles.block} aria-live="polite">
                <strong className={styles.blockTitle}>{t.sorryTitle}</strong>
                <p className={styles.muted}>{t.sorryText}</p>
                {noteFields}
                {googleUrl && (
                  <a
                    className={styles.textLink}
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ justifySelf: "center" }}
                  >
                    {t.googleAlso}
                  </a>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
