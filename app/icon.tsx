import { iconImage } from "./share-image";

// Sekme ve arama sonucu simgesi (Google en az 48px kare ister).
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return iconImage(size.width);
}
