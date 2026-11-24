import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Copy,
  Eye,
  Globe2,
  Images,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ProfileLayoutEditor } from "@/components/profile-layout-editor";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { getLensDesk, saveLensPage } from "@/lib/hypeup/lens-api";
import { CATEGORIES, validateUsername } from "@/lib/hypeup/lens-rules";
import type { PageDraft } from "@/lib/hypeup/lens-repo";
import { LENS_PUBLIC_HOST, publicProfileUrl } from "@/lib/hypeup/public-origin";

export const Route = createFileRoute("/_app/page")({
  loader: () => getLensDesk(),
  component: PageEditor,
});

function checkAddress(address: string, isPublic: boolean) {
  if (!address.trim())
    return isPublic ? "공개할 페이지 주소를 입력해 주세요." : null;
  const result = validateUsername(address);
  return result.ok ? null : result.error;
}

function PageEditor() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [form, setForm] = useState<PageDraft>(data.page);
  const [busy, setBusy] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null | undefined>(
    undefined,
  );
  const [edited, setEdited] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const addressInput = useRef<HTMLInputElement>(null);
  const [shareLink, setShareLink] = useState<{
    username: string;
    url: string;
  } | null>(null);
  const dirty = edited || profilePhoto !== undefined;
  const draftPhoto =
    profilePhoto === undefined
      ? data.avatarUrl
      : profilePhoto === null
        ? data.instagramAvatarUrl
        : `data:image/jpeg;base64,${profilePhoto}`;
  const savedAddressNeedsChange =
    Boolean(data.page.username) && !validateUsername(data.page.username).ok;
  const editingSavedConflict =
    savedAddressNeedsChange && form.username === data.page.username;
  const published =
    data.page.isPublic &&
    Boolean(data.page.username) &&
    !savedAddressNeedsChange;
  const visibleAddressError =
    addressError ??
    (editingSavedConflict
      ? "저장된 주소가 Lens에서 사용하는 주소와 겹쳐요. 새 주소를 입력해 주세요."
      : null);
  function patch(partial: Partial<PageDraft>) {
    setEdited(true);
    setForm((current) => ({ ...current, ...partial }));
  }

  useEffect(() => {
    if (
      addressError &&
      !busy &&
      document.activeElement !== addressInput.current
    )
      focusAddress();
  }, [addressError, busy]);

  function focusAddress() {
    addressInput.current?.scrollIntoView({ block: "center" });
    addressInput.current?.focus({ preventScroll: true });
  }

  function showAddressError(message: string) {
    if (!busy) focusAddress();
    setAddressError(message);
  }

  async function copyPublicLink() {
    const username = data.page.username;
    const url = publicProfileUrl(username);
    try {
      await navigator.clipboard.writeText(url);
      setShareLink(null);
      toast.success("공개 링크를 복사했습니다.");
    } catch {
      setShareLink({ username, url });
      toast.info("링크를 선택해 복사해 주세요.");
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="내 페이지"
        description="브랜드에게 보여줄 프로필과 협업 정보를 관리하세요."
        action={
          <Link
            to="/page/preview"
            className={ghostBtn}
            target={dirty || preparingPhoto ? "_blank" : undefined}
            rel="noreferrer"
          >
            <Eye className="size-4" aria-hidden /> 저장된 화면 보기
          </Link>
        }
      />
      <nav
        aria-label="내 페이지 바로가기"
        className="mb-4 flex flex-wrap gap-2"
      >
        <button
          type="button"
          className="lens-button lens-button-quiet"
          onClick={focusAddress}
        >
          <Globe2 className="size-4" aria-hidden /> 공개 설정
        </button>
        <Link to="/portfolio" className="lens-button lens-button-quiet">
          <Images className="size-4" aria-hidden /> 포트폴리오
        </Link>
        <Link to="/rates" className="lens-button lens-button-quiet">
          <Receipt className="size-4" aria-hidden /> 단가 관리
        </Link>
      </nav>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || preparingPhoto || !dirty) return;
          const problem = checkAddress(form.username, form.isPublic);
          if (problem) {
            showAddressError(problem);
            return;
          }
          setAddressError(null);
          setBusy(true);
          try {
            const result = await saveLensPage({
              data: {
                username: form.username,
                layout: form.layout,
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
                profilePhoto,
              },
            });
            if (!result.ok) {
              if (result.error === "이미 쓰는 주소입니다.") {
                setAddressError(
                  "이미 사용 중인 주소예요. 다른 주소를 입력해 주세요.",
                );
              } else {
                toast.error(result.error);
              }
              return;
            }
            toast.success("저장했습니다.");
            await router.invalidate();
            setForm(result.page);
            setProfilePhoto(undefined);
            setEdited(false);
          } catch {
            toast.error("페이지를 저장하지 못했습니다.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="min-w-0" disabled={busy} aria-busy={busy}>
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <ProfileLayoutEditor
              draft={form}
              photo={draftPhoto}
              preparingPhoto={preparingPhoto}
              onChange={(layout) => patch({ layout })}
            />
            <section className="lens-panel px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                프로필 편집
              </h2>
              <ProfilePhotoField
                name={form.displayName}
                savedAvatar={data.avatarUrl}
                instagramAvatar={data.instagramAvatarUrl}
                hasCustomPhoto={data.page.hasCustomPhoto}
                draft={profilePhoto}
                preparing={preparingPhoto}
                onPreparing={setPreparingPhoto}
                onChange={setProfilePhoto}
              />
              <Field label="이름">
                <input
                  className={inputClass}
                  value={form.displayName}
                  maxLength={40}
                  required
                  onChange={(event) =>
                    patch({ displayName: event.target.value })
                  }
                />
              </Field>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  공개 설정
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${published ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted"}`}
                >
                  <span
                    className="size-1.5 rounded-full bg-current"
                    aria-hidden
                  />
                  {savedAddressNeedsChange
                    ? "주소 변경 필요"
                    : published
                      ? "공개 중"
                      : "비공개"}
                </span>
              </div>
              <label
                htmlFor="public-page-address"
                className="mt-4 block text-sm font-medium text-muted"
              >
                공개 페이지 주소
              </label>
              <div
                className={`mt-2 flex min-h-12 items-center rounded-md border bg-surface-2 px-3.5 focus-within:border-accent ${visibleAddressError ? "border-danger" : "border-border"}`}
              >
                <span
                  id="public-page-address-domain"
                  className="shrink-0 text-sm text-muted"
                >
                  {LENS_PUBLIC_HOST}/
                </span>
                <input
                  ref={addressInput}
                  id="public-page-address"
                  className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-semibold placeholder:font-normal focus:outline-none"
                  value={form.username}
                  maxLength={24}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(visibleAddressError)}
                  aria-required={form.isPublic}
                  aria-describedby={
                    visibleAddressError
                      ? "public-page-address-error public-page-address-domain public-page-address-hint"
                      : "public-page-address-domain public-page-address-hint"
                  }
                  onChange={(event) => {
                    setAddressError(null);
                    patch({ username: event.target.value.toLowerCase() });
                  }}
                  placeholder="주소 입력"
                />
              </div>
              {visibleAddressError ? (
                <p
                  id="public-page-address-error"
                  role="alert"
                  className="mt-2 text-sm font-medium text-danger"
                >
                  {visibleAddressError}
                </p>
              ) : null}
              <p
                id="public-page-address-hint"
                className="mt-2 text-sm text-muted"
              >
                주소 끝부분에 들어갈 이름이에요. 영문 소문자·숫자·하이픈
                3~24자를 쓸 수 있어요.
              </p>
              {data.suggestion &&
              (!form.username.trim() || editingSavedConflict) ? (
                <button
                  type="button"
                  className="lens-button lens-button-secondary mt-2 max-w-full wrap-anywhere text-left"
                  onClick={() => {
                    setAddressError(null);
                    patch({ username: data.suggestion });
                    focusAddress();
                  }}
                >
                  추천 주소 {data.suggestion} 사용
                </button>
              ) : null}
              <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-between gap-3 border-t border-border py-2.5 text-sm font-medium">
                페이지 공개
                <input
                  className="peer sr-only"
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) => {
                    const next = event.target.checked;
                    patch({ isPublic: next });
                    const problem = next
                      ? checkAddress(form.username, true)
                      : null;
                    if (problem) showAddressError(problem);
                    else setAddressError(null);
                  }}
                />
                <span
                  aria-hidden
                  className="relative h-6 w-11 shrink-0 rounded-full bg-surface-2 ring-1 ring-border transition-colors peer-checked:bg-accent peer-checked:ring-transparent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent"
                >
                  <span
                    className={`absolute inset-y-0 left-0.5 my-auto size-5 rounded-full bg-white shadow-xs transition-transform motion-reduce:transition-none ${form.isPublic ? "translate-x-5" : ""}`}
                  />
                </span>
              </label>
              {form.isPublic && !published && !visibleAddressError ? (
                <p className="text-sm text-muted">
                  변경사항을 저장하면 페이지가 공개됩니다.
                </p>
              ) : null}
              {published ? (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-surface-2 px-2">
                  <a
                    href={publicProfileUrl(data.page.username)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="공개 페이지 열기"
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors hover:text-accent-ink"
                  >
                    <span className="truncate">{LENS_PUBLIC_HOST}/{data.page.username}</span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyPublicLink()}
                    aria-label="공개 링크 복사"
                    className="lens-icon-button bg-transparent text-muted"
                  >
                    <Copy className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}
              {published && shareLink?.username === data.page.username ? (
                <input
                  aria-label="복사할 공개 링크"
                  className={inputClass}
                  readOnly
                  value={shareLink.url}
                  onFocus={(event) => event.currentTarget.select()}
                />
              ) : null}
            </section>

            <section className="lens-panel px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                소셜 채널
              </h2>
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
                  onFollowers={(youtubeFollowers) =>
                    patch({ youtubeFollowers })
                  }
                />
              </div>
            </section>
            <section className="lens-panel px-4 py-5 sm:p-6">
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
                          patch({
                            links: form.links.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 className="size-[17px]" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </fieldset>

        <div
          className={`mt-4 grid items-center gap-2 border-t border-border bg-bg py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:gap-4 ${dirty ? "sticky bottom-0 z-10" : ""}`}
        >
          {dirty ? (
            <p className="text-sm text-muted">저장하지 않은 변경사항</p>
          ) : null}
          <button
            className={primaryBtn}
            type="submit"
            disabled={busy || preparingPhoto || !dirty}
          >
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
