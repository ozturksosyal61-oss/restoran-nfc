"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_PREFILL_EVENT, type ContactPrefill } from "../lib/contact";

// İletişim formunu konu ve mesajla doldurup forma götüren bağlantı.
// Form aynı sayfadaysa (ana sayfa) olayla doldurulur ve oraya kaydırılır;
// değilse ana sayfanın formuna ?konu=…&mesaj=… ile gidilir.
export default function ContactLink({
  topic,
  message,
  className,
  children,
}: ContactPrefill & { className?: string; children: ReactNode }) {
  const params = new URLSearchParams();
  if (topic) params.set("konu", topic);
  if (message) params.set("mesaj", message);
  const href = `/?${params.toString()}#iletisim`;

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        window.fbq?.("track", "Contact", { content_name: message ?? topic ?? "İletişim" });
        const form = document.getElementById("iletisim");
        if (!form) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent<ContactPrefill>(CONTACT_PREFILL_EVENT, { detail: { topic, message } }));
        form.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      }}
    >
      {children}
    </Link>
  );
}
