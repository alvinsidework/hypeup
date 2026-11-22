export function mobilePlatform() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  )
    return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return null;
}
