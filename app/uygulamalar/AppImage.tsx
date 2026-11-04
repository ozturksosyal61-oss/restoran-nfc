"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./uygulamalar.module.css";

// Görsel yoksa zarif bir placeholder gösterir.
export default function AppImage({
  src,
  alt,
  fallback,
  className,
}: {
  src: string;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    // Hidrasyondan önce yüklenemeyen görselin onError olayı kaçmış olabilir.
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <div className={styles.placeholder}>{fallback}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}
