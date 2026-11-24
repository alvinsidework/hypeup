import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isLensApp } from "@/lib/hypeup/native-auth";

const pendingKey = "lens-instagram-connection";
const handoffPath = "/api/auth/instagram/handoff";
const refreshInterval = 2_500;

type PendingConnection = { attemptId: string; expiresAt: number };
type BrowserConnection = {
  pending: PendingConnection | null | undefined;
  remember: (pending: PendingConnection | null) => void;
};

const BrowserConnectionContext = createContext<BrowserConnection | null>(null);

function savedConnection(): PendingConnection | null {
  try {
    const record = JSON.parse(localStorage.getItem(pendingKey) ?? "null");
    return typeof record?.attemptId === "string" &&
      typeof record.expiresAt === "number" &&
      record.expiresAt > Date.now()
      ? record
      : null;
  } catch {
    return null;
  }
}

function saveConnection(pending: PendingConnection | null) {
  try {
    if (pending) localStorage.setItem(pendingKey, JSON.stringify(pending));
    else localStorage.removeItem(pendingKey);
  } catch {
    // The current page can still receive the result when storage is blocked.
  }
}

export function InstagramBrowserAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pending, setPending] = useState<PendingConnection | null>();

  useEffect(() => {
    setPending(isLensApp() ? null : savedConnection());
  }, []);

  useEffect(() => {
    if (!pending) return;
    const { attemptId, expiresAt } = pending;
    let request: AbortController | undefined;
    let finished = false;

    function finish(error?: string) {
      finished = true;
      request?.abort();
      if (savedConnection()?.attemptId === attemptId) saveConnection(null);
      const url = new URL(error ? "/connect" : "/", window.location.origin);
      if (error) url.searchParams.set("error", error);
      window.location.replace(url.href);
    }

    async function check() {
      if (finished || document.visibilityState !== "visible") return;
      if (Date.now() >= expiresAt) {
        finish("oauth_pending");
        return;
      }
      if (request) return;
      const controller = new AbortController();
      request = controller;
      const deadline = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(handoffPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status >= 500) return;
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (result.status === "complete") finish();
        if (result.status === "failed") {
          finish(
            typeof result.error === "string" ? result.error : "oauth_retry",
          );
        }
      } catch {
        // Returning from a system browser can temporarily interrupt the connection.
      } finally {
        window.clearTimeout(deadline);
        request = undefined;
      }
    }

    const interval = window.setInterval(check, refreshInterval);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    void check();
    return () => {
      finished = true;
      request?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pending]);

  function remember(connection: PendingConnection | null) {
    saveConnection(connection);
    setPending(connection);
  }

  return (
    <BrowserConnectionContext.Provider value={{ pending, remember }}>
      {children}
    </BrowserConnectionContext.Provider>
  );
}

// The hook reads the context created by the provider above.
// eslint-disable-next-line react-refresh/only-export-components
export function useInstagramBrowserAuth() {
  const connection = useContext(BrowserConnectionContext);
  if (!connection) throw new Error("InstagramBrowserAuthProvider is missing");
  return connection;
}
