export const LENS_PUBLIC_HOST = "lens4u.here";
export const LENS_PUBLIC_ORIGIN = `https://www.${LENS_PUBLIC_HOST}`;
export const LENS_LEGACY_ORIGIN = "https://hypeupinsta.vercel.app";

export function publicProfileUrl(username: string): string {
  return `${LENS_PUBLIC_ORIGIN}/${encodeURIComponent(username)}`;
}
