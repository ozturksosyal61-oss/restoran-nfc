// Tanıtım sitesinin çizgi ikonları (ana sayfa ve açılış sayfaları).

const iconPaths = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  nfc: "M8.5 16.5a6 6 0 0 1 0-9M12 19a9.5 9.5 0 0 1 0-14M5 14a2.5 2.5 0 0 1 0-4",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  cart: "M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2M10 20h.01M17 20h.01",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  palette:
    "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.9-.7-1.3-.7-2.1 0-.9.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  plus: "M12 5v14M5 12h14",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
} as const;

export type SiteIconName = keyof typeof iconPaths;

export default function SiteIcon({ name, className }: { name: SiteIconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
