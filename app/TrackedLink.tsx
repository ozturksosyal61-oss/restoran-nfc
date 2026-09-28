"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: string;
  eventParams?: Record<string, string>;
};

// Tıklamada Meta Pixel olayı gönderen Link.
// Sunucu bileşenlerinin onClick verememesi nedeniyle ayrı tutuldu.
export default function TrackedLink({
  event,
  eventParams,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        window.fbq?.("track", event, eventParams);
        onClick?.(e);
      }}
    />
  );
}
