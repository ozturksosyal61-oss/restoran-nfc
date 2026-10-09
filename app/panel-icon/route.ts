import { iconImage } from "../share-image";

// Panel uygulaması ve bildirim simgesi (Android en az 192px, tercihen 512px ister).
export const dynamic = "force-static";

export function GET() {
  return iconImage(512);
}
