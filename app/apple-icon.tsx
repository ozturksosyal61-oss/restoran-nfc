import { iconImage } from "./share-image";

// iPhone / iPad ana ekran simgesi.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return iconImage(size.width);
}
