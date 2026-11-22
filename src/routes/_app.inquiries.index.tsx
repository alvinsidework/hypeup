import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { getLensInquiries } from "@/lib/hypeup/lens-api";
import { relativeTime } from "@/lib/hypeup/format";
import { statusLabel, type DealStatus } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/_app/inquiries/")({
  loader: () => getLensInquiries({ data: { archived: false } }),
  component: InquiryList,
});

function InquiryList() {
  const initial = Route.useLoaderData();
  const [archived, setArchived] = useState(false);
  const [data, setData] = useState(initial);

  async function load(next: boolean) {
    setArchived(next);
    setData(await getLensInquiries({ data: { archived: next } }));
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="브랜드 문의" description="공개 페이지로 들어온 대화입니다. 인스타그램 댓글 인박스와는 따로입니다." />
      <div className="mb-4 flex gap-2">
        <button type="button" className={`h-9 rounded-md px-3 text-[13px] ${archived ? "" : "bg-fg text-bg"}`} onClick={() => void load(false)}>
          진행
        </button>
        <button type="button" className={`h-9 rounded-md px-3 text-[13px] ${archived ? "bg-fg text-bg" : ""}`} onClick={() => void load(true)}>
          보관
        </button>
      </div>
      {data.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-8">
          <p className="text-[14px]">{archived ? "보관한 문의가 없습니다." : "아직 문의가 없어요. 바이오에 이 링크를 걸어 두세요."}</p>
          {data.publicPath ? (
            <button
              type="button"
              className="mt-3 text-[13px] underline"
              onClick={async () => {
                const url = `${window.location.origin}${data.publicPath}`;
                await navigator.clipboard.writeText(url);
                toast.success("링크를 복사했습니다.");
              }}
            >
              링크 복사
            </button>
          ) : (
            <Link to="/page" className="mt-3 inline-block text-[13px] underline">
              페이지에서 주소를 만들고 공개로 저장하세요.
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {data.items.map((item) => (
            <li key={item.id}>
              <Link to="/inquiries/$id" params={{ id: item.id }} className="block px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium">{item.company}</p>
                  <span className="text-[11px] text-muted">{item.trustLabel}</span>
                  {item.dealStatus ? <span className="rounded-md border border-border px-1.5 text-[11px]">{statusLabel(item.dealStatus as DealStatus)}</span> : null}
                  {item.unread > 0 ? <span className="text-[11px] tabular-nums">{item.unread}</span> : null}
                </div>
                <p className="mt-1 truncate text-[13px] text-muted">{item.lastBody}</p>
                <p className="mt-1 text-[11px] text-subtle">{relativeTime(item.lastAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
