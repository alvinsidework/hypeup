import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, EllipsisVertical, Share, X } from "lucide-react";
import { isLensApp } from "@/lib/hypeup/native-auth";

type InstallPlatform = "ios" | "android";

type InstallPrompt = Event & {
  prompt: () => Promise<unknown>;
  userChoice?: Promise<unknown>;
};

type InstallContext = {
  platform: InstallPlatform | null;
  pending: boolean;
  requestInstall: () => Promise<boolean> | null;
};

const PwaInstallContext = createContext<InstallContext | null>(null);

function mobilePlatform(): InstallPlatform | null {
  const { userAgent, platform, maxTouchPoints } = navigator;
  if (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  )
    return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return null;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [installed, setInstalled] = useState(false);
  const [pending, setPending] = useState(false);
  const promptEvent = useRef<InstallPrompt | null>(null);

  useEffect(() => {
    if (!window.isSecureContext || isLensApp() || window.top !== window) return;
    const platform = mobilePlatform();
    if (!platform) return;

    const standalone = window.matchMedia("(display-mode: standalone)");
    const fullScreen = window.matchMedia("(display-mode: fullscreen)");

    function updatePlatform() {
      const homeScreen =
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setPlatform(
        standalone.matches || fullScreen.matches || homeScreen
          ? null
          : platform,
      );
    }

    function capturePrompt(event: Event) {
      const prompt = event as InstallPrompt;
      if (typeof prompt.prompt !== "function") return;
      event.preventDefault();
      promptEvent.current = prompt;
    }

    function finishInstall() {
      promptEvent.current = null;
      setInstalled(true);
    }

    updatePlatform();
    standalone.addEventListener("change", updatePlatform);
    fullScreen.addEventListener("change", updatePlatform);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", finishInstall);
    return () => {
      standalone.removeEventListener("change", updatePlatform);
      fullScreen.removeEventListener("change", updatePlatform);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", finishInstall);
    };
  }, []);

  function requestInstall() {
    const event = promptEvent.current;
    if (!event) return null;
    promptEvent.current = null;
    setPending(true);

    return (async () => {
      try {
        await event.prompt();
        await event.userChoice;
        return true;
      } catch {
        return false;
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <PwaInstallContext.Provider
      value={{ platform: installed ? null : platform, pending, requestInstall }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function PwaInstallButton() {
  const install = useContext(PwaInstallContext);
  const [guideOpen, setGuideOpen] = useState(false);
  if (!install?.platform) return null;

  const isIos = install.platform === "ios";

  return (
    <Dialog.Root open={guideOpen} onOpenChange={setGuideOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="lens-button lens-button-secondary shrink-0 gap-1.5 px-3"
          aria-label="앱 설치"
          aria-busy={install.pending || undefined}
          aria-disabled={install.pending || undefined}
          onClick={(event) => {
            if (isIos) return;
            if (install.pending) {
              event.preventDefault();
              return;
            }
            const request = install.requestInstall();
            if (!request) return;
            event.preventDefault();
            void request.then((opened) => {
              if (!opened) setGuideOpen(true);
            });
          }}
        >
          <Download className="size-[17px]" strokeWidth={1.8} aria-hidden />
          <span className="hidden min-[360px]:inline">앱 설치</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay" />
        <Dialog.Content className="lens-sheet fixed inset-x-0 bottom-0 z-[61] max-h-[min(100dvh-1rem,42rem)] overflow-y-auto rounded-t-[28px] rounded-b-none px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg outline-none sm:inset-0 sm:m-auto sm:h-fit sm:w-[min(calc(100%-2rem),28rem)] sm:rounded-[26px] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-[26px] font-bold leading-tight tracking-tight">
              Lens 앱 설치
            </Dialog.Title>
            <Dialog.Close
              className="lens-icon-button shrink-0"
              aria-label="닫기"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
            {isIos ? "Safari" : "Chrome"}에서 이 페이지를 열고 Lens를 홈 화면에
            추가하세요.
          </Dialog.Description>
          {isIos ? (
            <ol className="mt-4 list-decimal space-y-3 rounded-lg bg-surface-2 py-4 pr-4 pl-9 text-sm leading-6 marker:font-semibold">
              <li>
                <strong>공유</strong>{" "}
                <Share
                  className="mb-0.5 inline size-4 text-muted"
                  aria-hidden
                />
                를 누르세요. 버튼이 안 보이면 페이지 메뉴를 열어 보세요.
              </li>
              <li>
                <strong>홈 화면에 추가</strong>를 선택하세요.
              </li>
              <li>
                <strong>웹 앱으로 열기</strong>가 보이면 켠 뒤{" "}
                <strong>추가</strong>를 누르세요.
              </li>
            </ol>
          ) : (
            <ol className="mt-4 list-decimal space-y-3 rounded-lg bg-surface-2 py-4 pr-4 pl-9 text-sm leading-6 marker:font-semibold">
              <li>
                Chrome 오른쪽 위 <strong>더보기</strong>
                <EllipsisVertical
                  className="mb-0.5 inline size-4 text-muted"
                  aria-hidden
                />
                를 누르세요.
              </li>
              <li>
                <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를
                선택하세요.
              </li>
              <li>
                확인 화면에서 <strong>설치</strong> 또는 <strong>추가</strong>를
                누르세요.
              </li>
            </ol>
          )}
          <Dialog.Close className="lens-button lens-button-secondary mt-5 w-full">
            확인
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
