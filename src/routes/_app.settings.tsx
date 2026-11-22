import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bell, ChevronDown, Instagram, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { LensConfirm } from "@/components/lens-confirm";
import { LensTheme } from "@/components/lens-theme";
import { useTaskProgress } from "@/components/route-progress";
import { Field, inputClass, primaryBtn } from "@/components/lens-ui";
import { copy } from "@/lib/hypeup/copy";
import { disconnectFn, resubscribeFn } from "@/lib/hypeup/api";
import { daysUntil, initial } from "@/lib/hypeup/format";
import { getLensDesk, saveLensPrivate } from "@/lib/hypeup/lens-api";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, demoMode } = Route.useRouteContext();
  const router = useRouter();
  const days = daysUntil(user.tokenExpiresAt);
  const [subscribing, setSubscribing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const startProgress = useTaskProgress();

  async function resubscribe() {
    const progress = startProgress({ label: "Instagram 실시간 수신 연결 중" });
    setSubscribing(true);
    try {
      const result = await resubscribeFn();
      toast[result.ok ? "success" : "error"](
        result.ok ? "다시 구독했습니다." : copy.webhookOff,
      );
      await router.invalidate();
    } catch {
      toast.error(copy.genericError);
    } finally {
      progress.finish();
      setSubscribing(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await disconnectFn();
      await router.navigate({
        to: "/connect",
        search: { error: undefined, detail: undefined },
      });
      await router.invalidate();
    } catch {
      toast.error(copy.genericError);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="설정"
        description="연결된 계정, 화면 설정, 정산 수단을 관리하세요."
      />
      <div className="space-y-4">
        <section
          className="lens-panel p-4 sm:p-5"
          aria-labelledby="account-heading"
        >
          <h2
            id="account-heading"
            className="text-lg font-semibold tracking-tight"
          >
            연결된 Instagram
          </h2>
          <div className="my-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-base font-semibold text-muted">
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  className="size-full object-cover"
                  alt=""
                />
              ) : (
                initial(user.username)
              )}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold break-all">
                @{user.username}
              </p>
              <p className="text-sm leading-6 text-muted">
                {[
                  user.name,
                  user.accountType === "BUSINESS"
                    ? "비즈니스"
                    : user.accountType === "MEDIA_CREATOR"
                      ? "크리에이터"
                      : user.accountType,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="divide-y divide-border border-t border-border">
            <p className="flex min-h-13 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm">
              <span className="inline-flex items-center gap-2 font-medium">
                <Instagram aria-hidden className="size-4 text-muted" /> 연결
                만료
              </span>
              <span
                className={
                  days !== null && days <= 0 ? "text-danger" : "text-muted"
                }
              >
                {days === null
                  ? "만료 정보 없음"
                  : days <= 0
                    ? "만료됨"
                    : `${days}일 남음`}
              </span>
            </p>
            {user.grantedScopes.length ? (
              <details className="group">
                <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium">
                  계정 권한{" "}
                  <ChevronDown
                    aria-hidden
                    className="size-4 text-muted transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <ul className="space-y-1 pb-3 text-sm break-all text-muted">
                  {user.grantedScopes.map((scope) => (
                    <li key={scope}>{scope}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </section>

        <section
          className="lens-panel flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
          aria-labelledby="webhook-heading"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
              <Bell aria-hidden className="size-[18px]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <h2 id="webhook-heading" className="text-base font-semibold">
                실시간 댓글·메시지
              </h2>
              <p
                className={`mt-1 text-sm leading-6 ${user.webhookSubscribedAt ? "text-ok" : "text-muted"}`}
              >
                {user.webhookSubscribedAt
                  ? "수신 중"
                  : "실시간 수신이 꺼져 있습니다."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="lens-button lens-button-secondary"
            disabled={subscribing}
            onClick={() => void resubscribe()}
          >
            {subscribing ? "구독 중" : copy.resubscribe}
          </button>
        </section>

        <section className="lens-panel p-4 sm:p-5">
          <LensTheme />
        </section>
        <PayoutSection />

        {demoMode ? (
          <p className="rounded-md bg-surface-2 px-4 py-3 text-sm text-muted">
            {copy.demoHint}
          </p>
        ) : null}

        <LensConfirm
          title="Instagram 연결을 해제할까요?"
          description="연결을 해제해도 Lens에 저장된 기록은 남습니다."
          confirmLabel={copy.disconnect}
          onConfirm={() => void disconnect()}
        >
          <button
            type="button"
            className="lens-button lens-button-quiet text-danger"
            disabled={disconnecting}
          >
            <LogOut aria-hidden className="size-4" />
            {disconnecting ? "해제 중" : copy.disconnect}
          </button>
        </LensConfirm>
      </div>
    </div>
  );
}

function PayoutSection() {
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [payoutLabel, setPayoutLabel] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "saving"
  >("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getLensDesk()
      .then((desk) => {
        if (!active) return;
        setNotifyEmail(desk.page.notifyEmail);
        setPayoutLabel(desk.page.payoutLabel);
        if (desk.page.payoutLabel)
          setBankName(desk.page.payoutLabel.split(" ")[0] ?? "");
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  async function savePayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "ready") return;
    setStatus("saving");
    try {
      const result = await saveLensPrivate({
        data: { notifyEmail, bankName, accountNumber, accountHolder },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPayoutLabel(result.payoutLabel);
      setAccountNumber("");
      toast.success("저장했습니다.");
    } catch {
      toast.error(copy.genericError);
    } finally {
      setStatus("ready");
    }
  }

  return (
    <section className="lens-panel p-4 sm:p-5" aria-labelledby="payout-heading">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
          <Wallet aria-hidden className="size-[18px]" strokeWidth={1.7} />
        </span>
        <h2
          id="payout-heading"
          className="text-lg font-semibold tracking-tight"
        >
          정산 수단
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        계좌 정보는 본인만 볼 수 있습니다. Lens가 직접 송금하지 않습니다.
      </p>
      {payoutLabel ? (
        <p className="mt-3 rounded-md bg-surface-2 px-3.5 py-3 text-sm">
          저장된 계좌 · {payoutLabel}
        </p>
      ) : null}
      {status === "error" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-danger" role="status">
            정산 수단을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            className="lens-button lens-button-secondary"
            onClick={() => {
              setStatus("loading");
              setLoadAttempt((current) => current + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => void savePayout(event)}
          aria-busy={status === "loading" || status === "saving"}
        >
          <fieldset
            disabled={status !== "ready"}
            className="grid min-w-0 sm:grid-cols-2 sm:gap-x-3"
          >
            <Field label="은행명">
              <input
                className={inputClass}
                maxLength={40}
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
              />
            </Field>
            <Field label="계좌번호">
              <input
                className={inputClass}
                maxLength={30}
                inputMode="numeric"
                autoComplete="off"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
              />
            </Field>
            <Field label="예금주">
              <input
                className={inputClass}
                maxLength={40}
                value={accountHolder}
                onChange={(event) => setAccountHolder(event.target.value)}
              />
            </Field>
          </fieldset>
          <p className="mt-4 text-sm text-muted">USDT 정산 준비 중</p>
          <button
            className={`${primaryBtn} mt-4`}
            type="submit"
            disabled={status !== "ready"}
          >
            {status === "saving"
              ? "저장 중"
              : status === "loading"
                ? "불러오는 중"
                : "저장"}
          </button>
        </form>
      )}
    </section>
  );
}
