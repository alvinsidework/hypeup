import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { MediaPlaceholder, MediaPreview } from "@/components/media-preview";
import type { MediaItem } from "@/lib/hypeup/types";

const MEDIA_LABELS: Record<string, string> = {
  IMAGE: "사진",
  VIDEO: "영상",
  CAROUSEL_ALBUM: "캐러셀",
  REELS: "릴스",
};

const gridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

export function mediaTypeLabel(type: string) {
  return MEDIA_LABELS[type] ?? type;
}

export function MediaGridSkeleton() {
  return (
    <div className={gridClass} aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="lens-panel overflow-hidden">
          <div className="relative aspect-square motion-safe:animate-pulse">
            <MediaPlaceholder crossed />
          </div>
          <div className="space-y-2 px-3.5 py-3.5 motion-safe:animate-pulse">
            <div className="h-[14px] w-3/4 rounded-full bg-surface-2" />
            <div className="h-3.5 w-2/5 rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaGrid({ media }: { media: MediaItem[] }) {
  return (
    <div className={gridClass}>
      {media.map((item, index) => (
        <Link
          key={item.id}
          to="/posts/$id"
          params={{ id: item.id }}
          preload="intent"
          className="lens-panel group min-w-0 overflow-hidden transition-[border-color,transform] duration-200 hover:border-accent motion-safe:active:scale-[.98]"
        >
          <MediaPreview media={item} eager={index < 2} />
          <div className="px-3.5 py-3">
            <p className="truncate text-sm font-semibold">
              {item.caption || "캡션 없음"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-muted">
              <span>{mediaTypeLabel(item.mediaType)}</span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <MessageCircle
                  aria-hidden
                  className="size-3.5"
                  strokeWidth={1.6}
                />
                <span className="sr-only">댓글</span>
                {item.commentsCount ?? 0}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
