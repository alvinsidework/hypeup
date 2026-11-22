import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowUpRight, Images, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { getLensDesk, saveLensPage } from "@/lib/hypeup/lens-api";
import { CATEGORIES } from "@/lib/hypeup/lens-rules";
import type { PageDraft } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/_app/page")({
  loader: () => getLensDesk(),
  component: PageEditor,
});

function PageEditor() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [form, setForm] = useState<PageDraft>(data.page);
  const [busy, setBusy] = useState(false);
  const patch = (partial: Partial<PageDraft>) =>
    setForm((current) => ({ ...current, ...partial }));

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="내 페이지"
        description="브랜드가 보는 프로필과 협업 정보를 편집합니다."
        action={
          data.page.username ? (
            <Link
              to="/$username"
              params={{ username: data.page.username }}
              className={ghostBtn}
              target="_blank"
              rel="noreferrer"
            >
              미리보기 <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : null
        }
      />
      <nav aria-label="협업 자료" className="mb-5 flex flex-wrap gap-2">
        <Link to="/rates" className={ghostBtn}>
          <Receipt className="size-4" aria-hidden /> 단가 관리
        </Link>
        <Link to="/portfolio" className={ghostBtn}>
          <Images className="size-4" aria-hidden /> 포트폴리오
        </Link>
      </nav>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            const result = await saveLensPage({
              data: {
                username: form.username,
                displayName: form.displayName,
                bio: form.bio,
                categories: form.categories,
                instagramHandle: form.instagramHandle,
                instagramFollowers: form.instagramFollowers,
                tiktokHandle: form.tiktokHandle,
                tiktokFollowers: form.tiktokFollowers,
                youtubeHandle: form.youtubeHandle,
                youtubeFollowers: form.youtubeFollowers,
                links: form.links,
                isPublic: form.isPublic,
              },
            });
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("저장했습니다.");
            await router.invalidate();
          } catch {
            toast.error("페이지를 저장하지 못했습니다.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="lens-panel px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">프로필</h2>
            <Field label="이름">
              <input
                className={inputClass}
                value={form.displayName}
                maxLength={40}
                onChange={(event) => patch({ displayName: event.target.value })}
              />
            </Field>
            <Field label="페이지 주소">
              <input
                className={inputClass}
                value={form.username}
                maxLength={24}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) =>
                  patch({ username: event.target.value.toLowerCase() })
                }
                placeholder={data.suggestion || "mina"}
              />
            </Field>
            {data.suggestion && !form.username ? (
              <button
                type="button"
                className="lens-button lens-button-quiet -ml-3 mt-1"
                onClick={() => patch({ username: data.suggestion })}
              >
                {data.suggestion} 사용
              </button>
            ) : null}
            <Field label="한 줄 소개">
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.bio}
                maxLength={80}
                onChange={(event) => patch({ bio: event.target.value })}
              />
            </Field>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">
                카테고리{" "}
                <span className="ml-1 font-normal text-muted">
                  {form.categories.length}/3
                </span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const on = form.categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && form.categories.length >= 3}
                      className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-45 ${on ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted hover:text-fg"}`}
                      onClick={() =>
                        patch({
                          categories: on
                            ? form.categories.filter(
                                (item) => item !== category,
                              )
                            : [...form.categories, category],
                        })
                      }
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section className="lens-panel px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">소셜 채널</h2>
            <p className="mt-1 text-sm text-muted">
              공개 프로필에 표시할 계정과 팔로워 수를 입력합니다.
            </p>
            <div className="mt-1 divide-y divide-border">
              <Channel
                label="인스타그램"
                handle={form.instagramHandle}
                followers={form.instagramFollowers}
                onHandle={(instagramHandle) => patch({ instagramHandle })}
                onFollowers={(instagramFollowers) =>
                  patch({ instagramFollowers })
                }
              />
              <Channel
                label="틱톡"
                handle={form.tiktokHandle}
                followers={form.tiktokFollowers}
                onHandle={(tiktokHandle) => patch({ tiktokHandle })}
                onFollowers={(tiktokFollowers) => patch({ tiktokFollowers })}
              />
              <Channel
                label="유튜브"
                handle={form.youtubeHandle}
                followers={form.youtubeFollowers}
                onHandle={(youtubeHandle) => patch({ youtubeHandle })}
                onFollowers={(youtubeFollowers) => patch({ youtubeFollowers })}
              />
            </div>
          </section>
        </div>

        <section className="lens-panel mt-4 px-4 py-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              추가 링크{" "}
              <span className="ml-1 text-sm font-normal text-muted">
                {form.links.length}/5
              </span>
            </h2>
            {form.links.length < 5 ? (
              <button
                type="button"
                className={ghostBtn}
                onClick={() =>
                  patch({ links: [...form.links, { label: "", url: "" }] })
                }
              >
                <Plus className="size-4" aria-hidden /> 링크 추가
              </button>
            ) : null}
          </div>
          {form.links.length ? (
            <div className="mt-2 divide-y divide-border">
              {form.links.map((link, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_44px] items-end gap-x-2 pb-3 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_44px]"
                >
                  <div className="min-w-0 sm:col-auto">
                    <Field label="이름">
                      <input
                        className={inputClass}
                        aria-label={`링크 ${index + 1} 이름`}
                        value={link.label}
                        onChange={(event) =>
                          patch({
                            links: form.links.map((item, i) =>
                              i === index
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1">
                    <Field label="주소">
                      <input
                        className={inputClass}
                        aria-label={`링크 ${index + 1} 주소`}
                        inputMode="url"
                        value={link.url}
                        placeholder="https://"
                        onChange={(event) =>
                          patch({
                            links: form.links.map((item, i) =>
                              i === index
                                ? { ...item, url: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    aria-label={`링크 ${index + 1} 삭제`}
                    className="lens-icon-button col-start-2 row-start-2 mb-0.5 text-muted hover:text-danger sm:col-start-3 sm:row-start-1"
                    onClick={() =>
                      patch({ links: form.links.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 className="size-[17px]" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-sm font-medium">
            <input
              className="size-5 accent-accent"
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => patch({ isPublic: event.target.checked })}
            />
            페이지 공개
          </label>
          <button className={primaryBtn} type="submit" disabled={busy}>
            {busy ? "저장 중…" : "변경사항 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Channel({
  label,
  handle,
  followers,
  onHandle,
  onFollowers,
}: {
  label: string;
  handle: string;
  followers: number | null;
  onHandle: (value: string) => void;
  onFollowers: (value: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2 pb-3 last:pb-0">
      <Field label={`${label} 핸들`}>
        <input
          className={inputClass}
          value={handle}
          placeholder="@username"
          autoCapitalize="none"
          onChange={(event) => onHandle(event.target.value)}
        />
      </Field>
      <Field label="팔로워 (직접 입력)">
        <input
          className={inputClass}
          aria-label={`${label} 팔로워`}
          inputMode="numeric"
          value={followers ?? ""}
          onChange={(event) =>
            onFollowers(
              event.target.value === "" ? null : Number(event.target.value),
            )
          }
        />
      </Field>
    </div>
  );
}
