import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RuleForm, type RuleDraft } from "@/components/rule-form";
import { RuleSimulator } from "@/components/rule-simulator";
import { copy } from "@/lib/hypeup/copy";
import { deleteRuleFn, getAutomations, saveRuleFn } from "@/lib/hypeup/api";
import type { RuleItem } from "@/lib/hypeup/types";

export const Route = createFileRoute("/_app/automations")({
  loader: () => getAutomations(),
  component: AutomationsPage,
});

function AutomationsPage() {
  const { rules, media } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [editing, setEditing] = useState<RuleItem | null | "new">(null);

  async function persist(draft: RuleDraft) {
    await saveRuleFn({
      data: {
        id: draft.id || undefined,
        name: draft.name,
        enabled: draft.enabled,
        scope: draft.scope,
        mediaId: draft.mediaId,
        matchMode: draft.matchMode,
        keywords: draft.keywords,
        excludeKeywords: draft.excludeKeywords,
        publicReplies: draft.publicReplies,
        dmMessage: draft.dmMessage,
        hideComment: draft.hideComment,
        sortOrder: draft.sortOrder,
      },
    });
    toast.success("룰을 저장했습니다.");
    setEditing(null);
    await router.invalidate();
  }

  return (
    <div>
      <PageHeader
        title="자동화"
        description="키워드가 맞으면 공개 대댓글과 DM을 보냅니다."
        action={
          <button
            type="button"
            className="h-11 rounded-md bg-fg px-4 text-[13px] font-medium text-bg"
            onClick={() => setEditing("new")}
          >
            룰 만들기
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {rules.length === 0 ? (
            <EmptyState
              title={copy.emptyRules}
              action={
                <button
                  type="button"
                  className="h-11 rounded-md bg-fg px-4 text-[13px] text-bg"
                  onClick={() => setEditing("new")}
                >
                  첫 자동화 만들기
                </button>
              }
            />
          ) : (
            rules.map((rule) => (
              <article key={rule.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-medium">{rule.name}</h2>
                    <p className="mt-1 text-[12px] text-muted">
                      {rule.matchMode} · {rule.keywords.join(", ") || "모든 댓글"}
                    </p>
                  </div>
                  <label className="flex h-10 items-center gap-2 text-[12px] text-muted">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={async (event) => {
                        await saveRuleFn({
                          data: { ...rule, enabled: event.target.checked, id: rule.id },
                        });
                        await router.invalidate();
                      }}
                    />
                    {rule.enabled ? "켜짐" : "꺼짐"}
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="h-10 rounded-md border border-border px-3 text-[12px]"
                    onClick={() => setEditing(rule)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded-md border border-border px-3 text-[12px] text-danger"
                    onClick={async () => {
                      if (!window.confirm("이 룰을 삭제할까요?")) return;
                      await deleteRuleFn({ data: { id: rule.id } });
                      await router.invalidate();
                    }}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        <RuleSimulator rules={rules} media={media} username={user.username} igUserId={user.igUserId} />
      </div>

      {editing !== null ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-surface p-5 sm:rounded-xl">
            <h2 className="mb-4 font-display text-2xl">
              {editing === "new" ? "새 룰" : "룰 수정"}
            </h2>
            <RuleForm
              initial={editing === "new" ? null : editing}
              media={media}
              onCancel={() => setEditing(null)}
              onSave={persist}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
