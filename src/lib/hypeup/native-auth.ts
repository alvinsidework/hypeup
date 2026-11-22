import { TESTER_ACCEPT_URL } from "./instagram-tester";

type NativeCapacitor = {
  isNativePlatform?: () => boolean;
};

function capacitor(): NativeCapacitor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Capacitor?: NativeCapacitor }).Capacitor;
}

export function isLensApp(): boolean {
  return capacitor()?.isNativePlatform?.() === true;
}

export function lensAuthStartUrl(): string {
  const url = new URL("/api/auth/instagram", window.location.origin);
  url.searchParams.set("client", "app");
  return url.toString();
}

async function openExternalPage(target: string): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: target });
  } catch {
    window.open(target, "_blank", "noopener");
  }
}

export function openInstagramLogin(): Promise<void> {
  return openExternalPage(lensAuthStartUrl());
}

export function openInstagramTesterInvites(): Promise<void> {
  return openExternalPage(TESTER_ACCEPT_URL);
}

export async function listenForLensAuthReturn(): Promise<() => void> {
  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");
  const handled = "lens-auth-return";

  const open = (url: string) => {
    if (!url || sessionStorage.getItem(handled) === url) return;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (parsed.protocol !== "dev.lens.app:" || parsed.hostname !== "auth") return;
    sessionStorage.setItem(handled, url);
    void Browser.close().catch(() => undefined);
    const handoff = parsed.searchParams.get("handoff");
    if (handoff) {
      window.location.assign(`/api/auth/instagram/handoff?handoff=${encodeURIComponent(handoff)}`);
      return;
    }
    const error = parsed.searchParams.get("error");
    if (!error) return;
    const next = new URL("/connect", window.location.origin);
    next.searchParams.set("error", error);
    const detail = parsed.searchParams.get("detail");
    if (detail) next.searchParams.set("detail", detail);
    window.location.assign(next.toString());
  };

  const launch = await App.getLaunchUrl();
  if (launch?.url) open(launch.url);
  const handle = await App.addListener("appUrlOpen", (event) => open(event.url));
  return () => {
    void handle.remove();
  };
}
