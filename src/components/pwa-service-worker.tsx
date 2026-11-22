import { useEffect } from "react";
import { isLensApp } from "@/lib/hypeup/native-auth";

export function PwaServiceWorker() {
  useEffect(() => {
    if (
      !window.isSecureContext ||
      window.self !== window.top ||
      isLensApp() ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void navigator.serviceWorker.register("/lens-sw.js").catch(() => {
      // Browser policy can block workers while still allowing Home Screen shortcuts.
    });
  }, []);

  return null;
}
