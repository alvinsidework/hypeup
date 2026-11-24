import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useInstagramBrowserAuth } from "@/components/instagram-browser-auth";
import { TESTER_ACCEPT_URL } from "@/lib/hypeup/instagram-tester";
import {
  isLensApp,
  openInstagramLogin,
  openInstagramTesterInvites,
} from "@/lib/hypeup/native-auth";
import { LENS_PUBLIC_ORIGIN } from "@/lib/hypeup/public-origin";

type InstagramLinkProps = {
  className: string;
  children: ReactNode;
};

type PreparedConnection = {
  attemptId: string;
  launchUrl: string;
  launchToken: string;
  expiresAt: number;
};

const instagramPath = "/api/auth/instagram";

function usesInstagramBrowserHandoff(): boolean {
  if (isLensApp()) return false;
  if (window.location.origin === LENS_PUBLIC_ORIGIN) return true;
  const { userAgent, platform, maxTouchPoints } = navigator;
  const ios =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  const homeScreen = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return (
    ios &&
    (homeScreen === true ||
      window.matchMedia("(display-mode: standalone)").matches)
  );
}

function InstagramBrowserConnect({ className, children }: InstagramLinkProps) {
  const { pending, remember } = useInstagramBrowserAuth();
  const [prepared, setPrepared] = useState<
    PreparedConnection | "failed" | null
  >(null);

  useEffect(() => {
    if (pending !== null || prepared) return;
    const request = new AbortController();

    async function prepare() {
      try {
        const response = await fetch(instagramPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
          signal: request.signal,
        });
        const result = await response.json();
        if (request.signal.aborted) return;
        if (!response.ok || result.status !== "ready") {
          setPrepared("failed");
          return;
        }
        setPrepared({
          attemptId: result.attemptId,
          launchUrl: result.launchUrl,
          launchToken: result.launchToken,
          expiresAt: Date.now() + result.expiresIn * 1000,
        });
      } catch {
        if (!request.signal.aborted) setPrepared("failed");
      }
    }

    void prepare();
    return () => request.abort();
  }, [pending, prepared]);

  if (pending) {
    return (
      <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3">
        <p
          className="flex items-center gap-2 text-sm font-semibold"
          role="status"
        >
          <LoaderCircle
            className="size-4 shrink-0 motion-safe:animate-spin"
            aria-hidden
          />
          Instagram 연결 확인 중
        </p>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Instagram에서 허용을 눌러 주세요. 완료 창을 닫으면 이곳에서 연결이
          이어져요.
        </p>
        <button
          type="button"
          className="lens-button lens-button-quiet mt-1"
          onClick={() => remember(null)}
        >
          다시 연결
        </button>
      </div>
    );
  }

  if (prepared === "failed") {
    return (
      <button
        type="button"
        className={className}
        onClick={() => setPrepared(null)}
      >
        연결 준비 다시 시도
      </button>
    );
  }

  if (!prepared) {
    return (
      <button type="button" className={className} disabled aria-busy="true">
        <LoaderCircle
          className="size-4 shrink-0 motion-safe:animate-spin"
          aria-hidden
        />
        연결 준비 중
      </button>
    );
  }

  return (
    <form
      action={prepared.launchUrl}
      method="post"
      target="_blank"
      rel="noopener"
      onSubmit={(event) => {
        event.preventDefault();
        if (Date.now() >= prepared.expiresAt - 30_000) {
          setPrepared(null);
          return;
        }
        event.currentTarget.submit();
        remember({
          attemptId: prepared.attemptId,
          expiresAt: prepared.expiresAt,
        });
        setPrepared(null);
      }}
    >
      <input type="hidden" name="launchToken" value={prepared.launchToken} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

export function InstagramConnectLink({
  className,
  children,
}: InstagramLinkProps) {
  const [paired, setPaired] = useState<boolean>();

  useEffect(() => {
    setPaired(usesInstagramBrowserHandoff());
  }, []);

  if (paired === undefined) {
    return (
      <button type="button" className={className} disabled>
        {children}
      </button>
    );
  }
  if (paired) {
    return (
      <InstagramBrowserConnect className={className}>
        {children}
      </InstagramBrowserConnect>
    );
  }

  return (
    <a
      href={instagramPath}
      className={className}
      onClick={(event) => {
        if (!isLensApp()) return;
        event.preventDefault();
        void openInstagramLogin();
      }}
    >
      {children}
    </a>
  );
}

export function InstagramTesterInviteLink({
  className,
  children,
}: InstagramLinkProps) {
  return (
    <a
      href={TESTER_ACCEPT_URL}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (!isLensApp()) return;
        event.preventDefault();
        void openInstagramTesterInvites();
      }}
    >
      {children}
    </a>
  );
}
