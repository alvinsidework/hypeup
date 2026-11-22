import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Mail,
  MailCheck,
} from "lucide-react";
import type { BrandAuthOptions } from "@/lib/hypeup/brand-auth-api";

type Failure = { ok: false; error: string; retryAfterSeconds?: number };
type CodeResponse =
  { ok: true; email: string; retryAfterSeconds: number } | Failure;
type VerifyResponse = { ok: true; redirectTo: string } | Failure;

async function postBrandAuth<T extends CodeResponse | VerifyResponse>(
  action: "start" | "verify",
  fields: Record<string, string>,
): Promise<T> {
  const response = await fetch(`/api/auth/brand/${action}`, {
    method: "POST",
    body: new URLSearchParams(fields),
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return response.json() as Promise<T>;
}

export function BrandSignIn({
  returnTo,
  options,
}: {
  returnTo: string;
  options: BrandAuthOptions;
}) {
  const fieldId = useId();
  const hintId = useId();
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const changingEmail = useRef(false);
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"send" | "resend" | "verify" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    if (sentEmail) codeInput.current?.focus();
    else if (changingEmail.current) {
      emailInput.current?.focus();
      changingEmail.current = false;
    }
  }, [sentEmail]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setRetrySeconds(seconds);
      if (!seconds) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  function startCooldown(seconds: number) {
    setRetrySeconds(seconds);
    setRetryAt(seconds > 0 ? Date.now() + seconds * 1000 : 0);
  }

  async function sendCode(address: string, repeat = false) {
    if (pending) return;
    setPending(repeat ? "resend" : "send");
    setNotice("");
    setError("");
    try {
      const result = await postBrandAuth<CodeResponse>("start", {
        email: address,
        returnTo,
      });
      if (result.retryAfterSeconds != null)
        startCooldown(result.retryAfterSeconds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentEmail(result.email);
      setEmail(result.email);
      setCode("");
      if (repeat) {
        setNotice("새 인증 코드를 보냈어요.");
        codeInput.current?.focus();
      }
    } catch {
      setError("코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(null);
    }
  }

  async function verifyCode() {
    if (pending || !/^[0-9]{6}$/.test(code)) return;
    setPending("verify");
    setNotice("");
    setError("");
    try {
      const result = await postBrandAuth<VerifyResponse>("verify", { code });
      if (result.ok) {
        window.location.assign(result.redirectTo);
        return;
      }
      setError(result.error);
    } catch {
      setError("인증을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setPending(null);
    codeInput.current?.focus();
  }

  function changeEmail() {
    changingEmail.current = true;
    setSentEmail("");
    setCode("");
    setNotice("");
    setError("");
    startCooldown(0);
  }

  if (!options.email) {
    return (
      <p
        className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-6 text-muted"
        role="status"
      >
        지금은 브랜드 이메일 로그인을 이용할 수 없어요.
      </p>
    );
  }

  if (!sentEmail) {
    return (
      <form
        className="grid gap-3"
        action="/api/auth/brand/start"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode(email);
        }}
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="grid gap-1.5">
          <label htmlFor={fieldId} className="text-sm font-medium">
            이메일
          </label>
          <input
            ref={emailInput}
            id={fieldId}
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@company.com"
            maxLength={254}
            required
            readOnly={pending !== null}
            className="lens-field"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm leading-6 text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending !== null}
          aria-busy={pending === "send"}
          className="lens-button lens-button-primary w-full"
        >
          {pending === "send" ? (
            <LoaderCircle
              className="size-4 shrink-0 motion-safe:animate-spin"
              aria-hidden
            />
          ) : (
            <Mail className="size-4 shrink-0" aria-hidden />
          )}
          {pending === "send" ? "인증 코드 보내는 중…" : "인증 코드 받기"}
        </button>
      </form>
    );
  }

  return (
    <section
      aria-label="이메일 인증 단계"
      className="lens-reveal rounded-2xl border border-border p-4 sm:p-5"
    >
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold tracking-tight">메일을 확인해 주세요</h2>
          <p
            id={hintId}
            className="mt-1 text-sm leading-6 text-muted [overflow-wrap:anywhere]"
          >
            <strong className="font-medium text-fg">{sentEmail}</strong>로 보낸
            6자리 코드를 입력하세요.
          </p>
        </div>
      </div>
      <form
        className="grid gap-3"
        action="/api/auth/brand/verify"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          void verifyCode();
        }}
      >
        <div className="grid gap-1.5">
          <label htmlFor={fieldId} className="text-sm font-medium">
            인증 코드
          </label>
          <input
            ref={codeInput}
            id={fieldId}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            aria-describedby={hintId}
            aria-invalid={Boolean(error)}
            readOnly={pending !== null}
            required
            placeholder="000000"
            value={code}
            onChange={(event) => {
              setCode(
                event.target.value
                  .normalize("NFKC")
                  .replace(/\D/g, "")
                  .slice(0, 6),
              );
              setError("");
            }}
            className="lens-field !h-14 text-center !text-[1.375rem] font-semibold tracking-[0.32em] tabular-nums placeholder:text-muted/55"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm leading-6 text-danger">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm leading-6 text-muted">
            {notice}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={code.length !== 6 || pending !== null}
          aria-busy={pending === "verify"}
          className="lens-button lens-button-primary w-full"
        >
          {pending === "verify" ? (
            <LoaderCircle
              className="size-4 shrink-0 motion-safe:animate-spin"
              aria-hidden
            />
          ) : (
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          )}
          {pending === "verify" ? "코드 확인 중…" : "인증하고 계속하기"}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-x-1">
          <button
            type="button"
            className="lens-button lens-button-quiet !px-2"
            disabled={pending !== null}
            onClick={changeEmail}
          >
            <ArrowLeft className="size-3.5 shrink-0" aria-hidden /> 이메일 변경
          </button>
          <button
            type="button"
            className="lens-button lens-button-quiet !px-2"
            disabled={retrySeconds > 0 || pending !== null}
            aria-busy={pending === "resend"}
            onClick={() => void sendCode(sentEmail, true)}
          >
            {pending === "resend" ? (
              <LoaderCircle
                className="size-3.5 shrink-0 motion-safe:animate-spin"
                aria-hidden
              />
            ) : null}
            다시 보내기{retrySeconds > 0 ? ` (${retrySeconds}초)` : ""}
          </button>
        </div>
      </form>
    </section>
  );
}
