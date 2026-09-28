// Aurora müşteri ekranlarının ortak çizgi ikonları (menü, sipariş, takip).

const paths = {
  back: "M15 5l-7 7 7 7",
  search: "M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM16 16l4 4",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4",
  receipt: "M6.5 3.8h11v16.4l-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4V3.8ZM9 8h6M9 11.5h6M9 15h4",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  trash: "M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12",
  bag: "M6 8h12l-1 12H7L6 8zM9 8V7a3 3 0 0 1 6 0v1",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  cash: "M3 6.5h18v11H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  card: "M3.5 6.5h17v11h-17zM3.5 10h17M7 14.5h4",
  star: "M12 3.8l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.82l-5.1 2.68.97-5.68L3.75 9.8l5.7-.83L12 3.8z",
  alert: "M12 4l9 16H3L12 4zM12 10v4M12 17v.01",
  plate: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
} as const;

export type AuroraIconName = keyof typeof paths;

export default function AuroraIcon({
  name,
  size = 18,
  strokeWidth = 1.8,
}: {
  name: AuroraIconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flex: "none" }}
    >
      <path d={paths[name]} />
    </svg>
  );
}
