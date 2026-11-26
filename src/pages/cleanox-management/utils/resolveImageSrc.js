import { BASE_URL } from "../../../lib/api";

export function resolveImageSrc(path) {
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
}
