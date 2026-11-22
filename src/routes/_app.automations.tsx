import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LensConfirm } from "@/components/lens-confirm";
import { PageHeader } from "@/components/page-header";
import {
  MATCH_LABELS,
  RuleForm,
  RuleSwitch,
  type RuleDraft,
} from "@/components/rule-form";
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
  const openButton = useRef<HTMLButtonElement | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [editor, setEditor] = useState<{
    open: boolean;
    rule: RuleItem | null;
  }>({ open: false, rule: null });
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openEditor(rule: RuleItem | null, trigger: HTMLButtonElement) {
    openButton.current = trigger;
    setEditor({ open: true, rule });
  }

  function closeEditor() {
    setEditor((current) => ({ ...current, open: false }));
  }

  async function persist(draft: RuleDraft) {
    await saveRuleFn({ data: { ...draft, id: draft.id || undefined } });
    toast.success("룰을 저장했습니다.");
    closeEditor();
    await router.invalidate();
  }

  async function updateRule(
    id: string,
    action: () => Promise<unknown>,
    success?: string,
  ) {
    setPendingId(id);
    try {
      await action();
      await router.invalidate();
      if (success) toast.success(success);
    } catch {
      toast.error(copy.genericError);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="자동화"
        description="댓글 조건과 보낼 답글을 정해 두면 Lens가 자동으로 응답합니다."
        action={
          rules.length ? (
            <button
              ref={createButton}
              type="button"
              className="lens-button lens-button-primary"
              onClick={(event) => openEditor(null, event.currentTarget)}
            >
              <Plus aria-hidden className="size-4" /> 룰 만들기
            </button>
          ) : null
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:gap-6">
        {rules.length === 0 ? (
          <EmptyState
            title="아직 자동화 룰이 없습니다"
            body="예를 들어 ‘가격’이 포함된 댓글에 견적을 DM으로 보낼 수 있어요."
            action={
              <button
                type="button"
                className="lens-button lens-button-primary"
                onClick={(event) => openEditor(null, event.currentTarget)}
              >
                <Plus aria-hidden className="size-4" /> 첫 룰 만들기
              </button>
            }
          />
        ) : (
          <ul className="lens-panel divide-y divide-border">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="px-4 py-4 sm:px-5"
                aria-busy={pendingId === rule.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                      <Zap
                        aria-hidden
                        className="size-[18px]"
                        strokeWidth={1.7}
                      />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold break-words">
                        {rule.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {MATCH_LABELS[rule.matchMode]} ·{" "}
                        {rule.scope === "ALL" ? "모든 게시물" : "선택한 게시물"}
                        {rule.followersOnly ? " · 팔로워만" : ""}
                      </p>
                    </div>
                  </div>
                  <RuleSwitch
                    label={`${rule.name} 룰 켜기`}
                    checked={rule.enabled}
                    disabled={pendingId !== null}
                    onChange={(enabled) =>
                      void updateRule(rule.id, () =>
                        saveRuleFn({ data: { ...rule, enabled } }),
                      )
                    }
                  />
                </div>
                {rule.keywords.length ? (
                  <div
                    className="mt-3 flex flex-wrap gap-1.5 pl-1 sm:pl-[3.25rem]"
                    aria-label="키워드"
                  >
                    {[...new Set(rule.keywords)].map((keyword) => (
                      <span
                        key={keyword}
                        className="max-w-full rounded-full bg-surface-2 px-3 py-1 text-sm break-words text-muted"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5 sm:pl-[2.5rem]">
                  <button
                    type="button"
                    className="lens-button lens-button-quiet min-h-11 px-3"
                    disabled={pendingId !== null}
                    onClick={(event) => openEditor(rule, event.currentTarget)}
                  >
                    <Pencil aria-hidden className="size-4" /> 수정
                  </button>
                  <LensConfirm
                    title="이 룰을 삭제할까요?"
                    description={`‘${rule.name}’ 룰의 자동 응답이 중단됩니다.`}
                    confirmLabel="룰 삭제"
                    onConfirm={() =>
                      void updateRule(
                        rule.id,
                        () => deleteRuleFn({ data: { id: rule.id } }),
                        "룰을 삭제했습니다.",
                      )
                    }
                  >
                    <button
                      type="button"
                      className="lens-button lens-button-quiet min-h-11 px-3 text-danger"
                      disabled={pendingId !== null}
                    >
                      <Trash2 aria-hidden className="size-4" /> 삭제
                    </button>
                  </LensConfirm>
                </div>
              </li>
            ))}
          </ul>
        )}
        <RuleSimulator
          rules={rules}
          media={media}
          username={user.username}
          igUserId={user.igUserId}
        />
      </div>

      <Dialog.Root
        open={editor.open}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="lens-overlay" />
          <Dialog.Content
            className="lens-sheet fixed inset-x-0 bottom-0 z-[55] max-h-[calc(100dvh_-_max(1rem,env(safe-area-inset-top)))] overflow-y-auto overscroll-contain rounded-b-none bg-surface outline-none sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-3rem)] sm:w-[min(calc(100%_-_3rem),36rem)] sm:rounded-xl"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              heading.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = openButton.current?.isConnected
                ? openButton.current
                : createButton.current;
              target?.focus({ preventScroll: true });
            }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface p-4 sm:px-6">
              <div>
                <Dialog.Title
                  ref={heading}
                  tabIndex={-1}
                  className="text-2xl font-bold tracking-tight outline-none"
                >
                  {editor.rule ? "룰 수정" : "새 자동화 룰"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  어떤 댓글에 어떻게 응답할지 설정하세요.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="lens-icon-button"
                aria-label="룰 편집 닫기"
              >
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </div>
            <RuleForm
              initial={editor.rule}
              media={media}
              onCancel={closeEditor}
              onSave={persist}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
