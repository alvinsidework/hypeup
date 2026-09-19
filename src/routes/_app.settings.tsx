import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { copy } from "@/lib/hypeup/copy";
import { disconnectFn, resubscribeFn } from "@/lib/hypeup/api";
import { daysUntil } from "@/lib/hypeup/format";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, demoMode } = Route.useRouteContext();
  const router = useRouter();
  const days = daysUntil(user.tokenExpiresAt);

  return (
    <div className="max-w-xl">
      <PageHeader title="설정" description="계정 연결과 webhook 상태입니다." />
      <section className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-subtle">연결된 계정</p>
        <p className="mt-2 font-display text-2xl">@{user.username}</p>
        <p className="mt-1 text-[13px] text-muted">{user.name ?? "이름 없음"} · {user.accountType ?? "계정"}</p>
        <p className="mt-3 text-[13px] tabular-nums text-muted">
          토큰 {days === null ? "없음" : days <= 0 ? "만료" : `${days}일 후 만료`}
        </p>
        <p className="mt-2 text-[12px] leading-5 text-subtle">{user.grantedScopes.join(", ") || "스코프 없음"}</p>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-surface p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-subtle">Webhook</p>
        <p className="mt-2 text-[13px] text-muted">
          {user.webhookSubscribedAt ? "구독됨" : copy.webhookOff}
        </p>
        <button
          type="button"
          className="mt-4 h-11 rounded-md border border-border px-4 text-[13px]"
          onClick={async () => {
            const result = await resubscribeFn();
            toast[result.ok ? "success" : "error"](result.ok ? "다시 구독했습니다." : copy.webhookOff);
            await router.invalidate();
          }}
        >
          {copy.resubscribe}
        </button>
      </section>

      {demoMode ? (
        <p className="mt-4 rounded-md border border-border bg-surface px-4 py-3 text-[13px] text-accent">
          {copy.demoHint}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-6 h-11 rounded-md border border-border px-4 text-[13px] text-danger"
        onClick={async () => {
          if (!window.confirm("Instagram 연결을 해제할까요? 토큰만 삭제되고 기록은 남습니다.")) return;
          await disconnectFn();
          await router.navigate({ to: "/connect", search: { error: undefined, detail: undefined } });
          await router.invalidate();
        }}
      >
        {copy.disconnect}
      </button>
    </div>
  );
}
