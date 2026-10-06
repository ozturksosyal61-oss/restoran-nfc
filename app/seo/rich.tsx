import Link from "next/link";
import type { ReactNode } from "react";

// Açılış sayfası metinleri seo-sayfalari.md'deki yazımla tutulur:
// **kalın** ve [bağlantı metni](/adres). Burada React öğelerine çevrilir;
// yapılandırılmış veri için düz metin hâli de üretilir.

const TOKEN = /\*\*(.+?)\*\*|\[(.+?)\]\((\/[^)\s]*)\)/g;

export function rich(text: string, linkClassName?: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;

  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    if (match[1] !== undefined) {
      nodes.push(<strong key={index++}>{rich(match[1], linkClassName)}</strong>);
    } else {
      nodes.push(
        <Link key={index++} href={match[3]} className={linkClassName}>
          {match[2]}
        </Link>
      );
    }
    last = start + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// JSON-LD için: işaretler kaldırılır, bağlantı metni kalır.
export function plain(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\((\/[^)\s]*)\)/g, "$1");
}
