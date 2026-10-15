import { whatsappUrl } from "../lib/contact";
import styles from "./WhatsAppButton.module.css";

// Tanıtım sitesinin tüm sayfalarında sağ altta sabit WhatsApp düğmesi
// (SiteFooter içinden çizilir). Mobil alt CTA çubuğu olan sayfalarda
// çubuğun üstünde durur.
export default function WhatsAppButton() {
  return (
    <a
      className={styles.button}
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp'tan yazın"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.7-1.1.2-.5.2-1 .1-1.1l-.6-.2Z" />
      </svg>
    </a>
  );
}
