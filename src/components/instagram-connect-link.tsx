import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowUpRight, Copy } from "lucide-react";
import { TESTER_ACCEPT_URL } from "@/lib/hypeup/instagram-tester";
import { mobilePlatform } from "@/lib/hypeup/mobile-platform";
import {
  isLensApp,
  openInstagramLogin,
  openInstagramTesterInvites,
} from "@/lib/hypeup/native-auth";

type InstagramLinkProps = {
  className: string;
  children: ReactNode;
};

export function InstagramConnectLink({
  className,
  children,
}: InstagramLinkProps) {
  return (
    <a
      href="/api/auth/instagram"
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

function subscribeToPlatform() {
  return () => {};
}

export function InstagramTesterInviteActions() {
  const platform = useSyncExternalStore(
    subscribeToPlatform,
    () => (mobilePlatform() === "ios" ? "ios" : "other"),
    () => "unknown" as const,
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">(
    "idle",
  );
  const manualAddress = useRef<HTMLInputElement>(null);
  const addressBar = platform === "ios" ? "Safari 주소창" : "브라우저 주소창";

  useEffect(() => {
    if (copyStatus !== "manual") return;
    manualAddress.current?.focus();
    manualAddress.current?.select();
  }, [copyStatus]);

  async function copyInviteAddress() {
    try {
      await navigator.clipboard.writeText(TESTER_ACCEPT_URL);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  }

  return (
    <div className="mt-3">
      {platform === "other" ? (
        <a
          href={TESTER_ACCEPT_URL}
          className="lens-button lens-button-primary w-full"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!isLensApp()) return;
            event.preventDefault();
            void openInstagramTesterInvites();
          }}
        >
          Instagram 웹사이트 권한 열기
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
        </a>
      ) : null}
      <button
        type="button"
        className={
          platform === "other"
            ? "lens-button lens-button-quiet mt-1 px-0"
            : "lens-button lens-button-primary w-full"
        }
        onClick={() => void copyInviteAddress()}
      >
        {platform === "ios" ? "Safari용 주소 복사" : "웹 권한 주소 복사"}
        <Copy className="size-4 shrink-0" aria-hidden />
      </button>
      <p
        role="status"
        className="mt-2 text-sm leading-6 text-muted [word-break:keep-all]"
      >
        {copyStatus === "copied"
          ? `주소를 복사했어요. ${addressBar}에 직접 붙여넣으세요.`
          : copyStatus === "manual"
            ? `아래 주소를 복사해 ${addressBar}에 직접 붙여넣으세요.`
            : platform === "other"
              ? "Instagram 앱이 열리면 주소를 복사해 브라우저 주소창에 붙여넣으세요."
              : `복사한 주소를 ${addressBar}에 직접 붙여넣으세요.`}
      </p>
      {copyStatus === "manual" ? (
        <input
          ref={manualAddress}
          type="text"
          readOnly
          aria-label="Instagram 웹사이트 권한 주소"
          className="lens-field mt-2"
          value={TESTER_ACCEPT_URL}
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
