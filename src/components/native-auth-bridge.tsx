import { useEffect } from "react";
import { isLensApp, listenForLensAuthReturn } from "@/lib/hypeup/native-auth";

export function NativeAuthBridge() {
  useEffect(() => {
    if (!isLensApp()) return;
    let remove = () => {};
    let cancelled = false;
    void listenForLensAuthReturn().then((stop) => {
      if (cancelled) stop();
      else remove = stop;
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, []);
  return null;
}
