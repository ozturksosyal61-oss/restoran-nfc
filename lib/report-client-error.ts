// Tarayıcıdaki hatayı sunucuya bildirir (/api/hata). Aynı hata bir sayfa
// açılışında bir kez, toplamda en fazla 10 kez gönderilir.

const sent = new Set<string>();

// Tarayıcı eklentilerinden ve dış betiklerden gelen, bizim düzeltemeyeceğimiz hatalar.
const IGNORED = [
  /^Script error\.?$/i,
  /ResizeObserver loop/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /Load failed|Failed to fetch|NetworkError|network error/i,
  /AbortError|The operation was aborted/i,
  /fbevents|connect\.facebook\.net/i,
];

export function reportClientError(error: unknown, extra?: { digest?: string }) {
  // Sunucuda oluşan hata (digest'li) sunucu tarafında zaten kaydedildi.
  if (extra?.digest) return;
  try {
    const err = error as { message?: unknown; stack?: unknown } | null;
    const message = err && typeof err === "object" && err.message ? String(err.message) : String(error ?? "");
    const stack = err && typeof err === "object" && err.stack ? String(err.stack) : "";
    if (!message || IGNORED.some((pattern) => pattern.test(message) || pattern.test(stack))) return;

    const key = message.slice(0, 200);
    if (sent.has(key) || sent.size >= 10) return;
    sent.add(key);

    const body = JSON.stringify({
      message: message.slice(0, 1000),
      stack: stack.slice(0, 4000),
      path: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/hata", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/hata", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Bildirim gönderilemezse sayfa etkilenmez.
  }
}
