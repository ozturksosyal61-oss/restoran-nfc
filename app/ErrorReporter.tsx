"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/report-client-error";

// Sayfada yakalanmayan tarayıcı hatalarını hata kayıtlarına gönderir.
export default function ErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      reportClientError(event.error ?? event.message);
    }
    function onRejection(event: PromiseRejectionEvent) {
      reportClientError(event.reason);
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
