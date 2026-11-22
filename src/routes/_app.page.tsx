import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
  const patch = (partial: Partial<PageDraft>) => setForm((current) => ({ ...current, ...partial }));

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex gap-3 text-[13px]">
        <Link to="/rates" className="underline">단가</Link>
        <Link to="/portfolio" className="underline">포트폴리오</Link>
      </div>
      <PageHeader
        title="내 페이지"
        description="바이오에 걸 공개 페이지입니다. 저장하기 전에는 반영되지 않습니다."
        action={
          data.page.username ? (
            <Link to="/$username" params={{ username: data.page.username }} className={ghostBtn} target="_blank">
              미리보기
            </Link>
          ) : null
        }
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
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
          setBusy(false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("저장했습니다.");
          await router.invalidate();
        }}
      >
        <Field label="이름">
          <input className={inputClass} value={form.displayName} maxLength={40} onChange={(event) => patch({ displayName: event.target.value })} />
        </Field>
        <Field label="주소">
          <input className={inputClass} value={form.username} maxLength={24} onChange={(event) => patch({ username: event.target.value.toLowerCase() })} placeholder={data.suggestion || "mina"} />
        </Field>
        {data.suggestion && !form.username ? (
          <button type="button" className="mt-2 text-[12px] text-muted underline" onClick={() => patch({ username: data.suggestion })}>
            {data.suggestion} 사용
          </button>
        ) : null}
        <Field label="한 줄 소개">
          <input className={inputClass} value={form.bio} maxLength={80} onChange={(event) => patch({ bio: event.target.value })} />
        </Field>
        <p className="mt-4 text-[12px] text-muted">카테고리, 최대 3개</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const on = form.categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                className={`h-9 rounded-md border px-3 text-[12px] ${on ? "border-fg bg-fg text-bg" : "border-border"}`}
                onClick={() => {
                  const categories = on
                    ? form.categories.filter((item) => item !== category)
                    : form.categories.length >= 3
                      ? form.categories
                      : [...form.categories, category];
                  patch({ categories });
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
        <Channel label="인스타그램" handle={form.instagramHandle} followers={form.instagramFollowers} onHandle={(instagramHandle) => patch({ instagramHandle })} onFollowers={(instagramFollowers) => patch({ instagramFollowers })} />
        <Channel label="틱톡" handle={form.tiktokHandle} followers={form.tiktokFollowers} onHandle={(tiktokHandle) => patch({ tiktokHandle })} onFollowers={(tiktokFollowers) => patch({ tiktokFollowers })} />
        <Channel label="유튜브" handle={form.youtubeHandle} followers={form.youtubeFollowers} onHandle={(youtubeHandle) => patch({ youtubeHandle })} onFollowers={(youtubeFollowers) => patch({ youtubeFollowers })} />
        <p className="mt-4 text-[12px] text-muted">다른 링크, 최대 5개</p>
        {form.links.map((link, index) => (
          <div key={index} className="mt-2 grid grid-cols-[1fr_1.4fr_auto] gap-2">
            <input className={inputClass} value={link.label} placeholder="이름" onChange={(event) => patch({ links: form.links.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)) })} />
            <input className={inputClass} value={link.url} placeholder="https://" onChange={(event) => patch({ links: form.links.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)) })} />
            <button type="button" className={ghostBtn} onClick={() => patch({ links: form.links.filter((_, i) => i !== index) })}>
              삭제
            </button>
          </div>
        ))}
        {form.links.length < 5 ? (
          <button type="button" className={`${ghostBtn} mt-2`} onClick={() => patch({ links: [...form.links, { label: "", url: "" }] })}>
            링크 추가
          </button>
        ) : null}
        <label className="mt-4 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={form.isPublic} onChange={(event) => patch({ isPublic: event.target.checked })} />
          공개
        </label>
        <button className={`${primaryBtn} mt-4`} type="submit" disabled={busy}>
          저장
        </button>
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
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={`${label} 핸들`}>
        <input className={inputClass} value={handle} onChange={(event) => onHandle(event.target.value)} />
      </Field>
      <Field label="팔로워 (직접 입력)">
        <input
          className={inputClass}
          inputMode="numeric"
          value={followers ?? ""}
          onChange={(event) => onFollowers(event.target.value === "" ? null : Number(event.target.value))}
        />
      </Field>
    </div>
  );
}
