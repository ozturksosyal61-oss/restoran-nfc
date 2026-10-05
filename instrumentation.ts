import type { Instrumentation } from "next";

// Sunucu hataları (sayfa, API, sunucu işlemi) hata kayıtlarına yazılır.
// Sistem paneli → Hatalar.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const err = error as { message?: unknown; stack?: unknown; digest?: unknown } | null;
  const digest = err && typeof err === "object" && "digest" in err ? String(err.digest) : null;
  // Yönlendirme / bulunamadı sinyalleri hata değildir.
  if (digest?.startsWith("NEXT_")) return;

  const userAgent = request.headers["user-agent"];
  const { logError } = await import("./lib/error-log");
  await logError({
    source: "server",
    message: err && typeof err === "object" && err.message ? String(err.message) : String(error),
    stack: err && typeof err === "object" && err.stack ? String(err.stack) : null,
    path: request.path,
    route: `${context.routeType}: ${context.routePath}`,
    digest,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent ?? null,
  });
};
