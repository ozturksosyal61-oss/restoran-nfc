import { ImageResponse } from "next/og";
import { SHARE_ALT, SHARE_SIZE } from "../share-image";
import { SITE_HOST } from "../../lib/site";

export const alt = SHARE_ALT;
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(circle at 85% 15%, rgba(217,184,102,0.28), transparent 45%), #0b0b0d",
          color: "#f7f4ee",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 6, color: "#d9b866" }}>OZT DIGITAL</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.05, letterSpacing: -2 }}>OZT Digital Uygulamaları</div>
          <div style={{ display: "flex", fontSize: 32, color: "#cfc8bb" }}>Yapay zekâlı, akıllı ve eğlenceli mobil uygulamalar</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#d9b866" }}>{SITE_HOST}/uygulamalar</div>
      </div>
    ),
    SHARE_SIZE
  );
}
