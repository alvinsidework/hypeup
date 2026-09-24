import { useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { submitAccessRequest } from "@/lib/hypeup/access-request";
import { postAccessRequest } from "@/lib/hypeup/access-request-mail";

export function AccessRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setBusy(false);
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
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-bg/70 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[min(100dvh-2rem,640px)] w-[min(100%-2rem,440px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6 text-fg outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-2xl tracking-tight">사용 신청</Dialog.Title>
            <Dialog.Close className="flex size-9 items-center justify-center rounded-md text-muted hover:text-fg" aria-label="닫기">
              <X className="size-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-[13px] leading-6 text-muted">
            계정명과 이메일을 남겨 주세요. 테스터로 등록되면 초대 수락 링크를 메일로 보내 드립니다.
          </Dialog.Description>

          {sent ? (
            <p className="mt-6 text-[14px] leading-7" role="status">
              신청을 보냈습니다. 테스터 등록이 끝나면 입력한 메일로 수락 링크가 갑니다.
            </p>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
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
                    if (result.relay && !(await postAccessRequest(result.relay))) {
                      setError("신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
                      return;
                    }
                    setSent(true);
                  })
                  .catch(() => setError("신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요."))
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
              <label className="block space-y-2">
                <span className="text-[12px] text-muted">인스타그램 계정명</span>
                <input
                  required
                  name="instagram"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="@username"
                  value={instagram}
                  onChange={(event) => setInstagram(event.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px] outline-none focus-visible:border-accent"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-[12px] text-muted">이메일 주소</span>
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px] outline-none focus-visible:border-accent"
                />
              </label>
              <div className="flex items-start gap-3 text-[13px] leading-6">
                <input
                  id="access-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 size-4 accent-[var(--color-accent)]"
                />
                <p>
                  <label htmlFor="access-consent" className="cursor-pointer">
                    이용에 동의합니다.{" "}
                  </label>
                  <Link to="/terms" className="text-fg underline" target="_blank">
                    이용약관
                  </Link>
                  {" · "}
                  <Link to="/privacy" className="text-fg underline" target="_blank">
                    개인정보처리방침
                  </Link>
                </p>
              </div>
              {error ? (
                <p className="text-[13px] text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy || !consent}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-fg px-4 text-[13px] font-medium text-bg disabled:opacity-50"
              >
                {busy ? "보내는 중" : "신청하기"}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
