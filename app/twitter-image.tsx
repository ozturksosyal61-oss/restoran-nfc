import { SHARE_ALT, SHARE_SIZE, shareImage } from "./share-image";

export const alt = SHARE_ALT;
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareImage();
}
