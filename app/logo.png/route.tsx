import { logoImage } from "../share-image";

// Arama motorları için logo (Organization yapılandırılmış verisi): /logo.png
export const dynamic = "force-static";

export function GET() {
  return logoImage(512);
}
