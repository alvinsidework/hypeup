import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { submitAccessRequest } from "@/lib/hypeup/access-request";
import { postAccessRequest } from "@/lib/hypeup/access-request-mail";
import { copy } from "@/lib/hypeup/copy";

export function AccessRequestDialog() {
  const [open, setOpen] = useState(false);
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const consentId = useId();

  function close(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      if (sent) {
        setInstagram("");
        setEmail("");
        setConsent(false);
        setSent(false);
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Trigger asChild>
        <button type="button" className="lens-button lens-button-primary">
          {copy.applyForAccess} <ArrowRight className="size-4" aria-hidden />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay fixed inset-0 z-[60]" />
        <Dialog.Content className="lens-sheet fixed inset-x-0 bottom-0 z-[61] max-h-[min(100dvh-1rem,42rem)] overflow-y-auto rounded-t-[28px] rounded-b-none px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg outline-none sm:inset-0 sm:m-auto sm:h-fit sm:w-[min(calc(100%-2rem),28rem)] sm:rounded-[26px] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-[26px] font-bold leading-tight tracking-tight">
              사용 신청
            </Dialog.Title>
            <Dialog.Close
              className="lens-icon-button shrink-0"
              aria-label="닫기"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted [word-break:keep-all]">
            계정명과 이메일을 남겨 주세요. 테스터로 등록되면 초대 수락 링크를
            메일로 보내 드립니다.
          </Dialog.Description>

          {sent ? (
            <div className="mt-6 grid gap-4">
              <p
                className="flex gap-3 rounded-[18px] bg-surface-2 p-4 text-[15px] leading-6"
                role="status"
              >
                <Check className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                <span>
                  신청을 보냈습니다. 테스터 등록이 끝나면 입력한 메일로 수락
                  링크가 갑니다.
                </span>
              </p>
              <Dialog.Close className="lens-button lens-button-primary">
                확인
              </Dialog.Close>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || !consent) return;
                setError(null);
                setBusy(true);
                void submitAccessRequest({
                  data: { instagram, email, consent, companyWebsite },
                })
                  .then(async (result) => {
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    if (
                      result.relay &&
                      !(await postAccessRequest(result.relay))
                    ) {
                      setError(
                        "신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
                      );
                      return;
                    }
                    setSent(true);
                  })
                  .catch(() =>
                    setError(
                      "신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <div className="sr-only" aria-hidden="true">
                <label>
                  웹사이트
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={companyWebsite}
                    onChange={(event) => setCompanyWebsite(event.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-medium">인스타그램 계정명</span>
                <input
                  required
                  name="instagram"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="@username"
                  maxLength={40}
                  value={instagram}
                  onChange={(event) => setInstagram(event.target.value)}
                  className="lens-field w-full"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">이메일 주소</span>
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  maxLength={200}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="lens-field w-full"
                />
              </label>
              <div className="flex min-h-11 items-start gap-3 rounded-[14px] px-0.5 py-2 text-sm leading-6 text-muted">
                <input
                  id={consentId}
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]"
                />
                <div className="min-w-0">
                  <label
                    htmlFor={consentId}
                    className="cursor-pointer [word-break:keep-all]"
                  >
                    이용에 동의합니다.
                  </label>
                  <div className="flex flex-wrap items-center gap-x-3 text-fg">
                    <Link
                      to="/terms"
                      className="underline underline-offset-3"
                      target="_blank"
                      rel="noopener"
                    >
                      이용약관
                    </Link>
                    <Link
                      to="/privacy"
                      className="underline underline-offset-3"
                      target="_blank"
                      rel="noopener"
                    >
                      개인정보처리방침
                    </Link>
                  </div>
                </div>
              </div>
              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy || !consent}
                aria-busy={busy}
                className="lens-button lens-button-primary w-full"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : null}
                {busy ? "보내는 중" : "신청하기"}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
