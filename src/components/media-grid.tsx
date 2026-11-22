import { Link } from "@tanstack/react-router";
import { ImageIcon, MessageCircle, Play } from "lucide-react";
import type { MediaItem } from "@/lib/hypeup/types";

const MEDIA_LABELS: Record<string, string> = {
  IMAGE: "사진",
  VIDEO: "영상",
  CAROUSEL_ALBUM: "캐러셀",
  REELS: "릴스",
};

export function mediaTypeLabel(type: string) {
  return MEDIA_LABELS[type] ?? type;
}

export function MediaGrid({ media }: { media: MediaItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {media.map((item) => (
        <Link
          key={item.id}
          to="/posts/$id"
          params={{ id: item.id }}
          preload="intent"
          className="lens-panel group min-w-0 overflow-hidden transition-[border-color,transform] duration-200 hover:border-accent motion-safe:active:scale-[.98]"
        >
          <div className="relative aspect-square bg-surface-2">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.025]"
              />
            ) : (
              <div
                className="grid size-full place-items-center text-muted"
                aria-hidden
              >
                {item.mediaType === "REELS" || item.mediaType === "VIDEO" ? (
                  <Play className="size-6" strokeWidth={1.6} />
                ) : (
                  <ImageIcon className="size-6" strokeWidth={1.6} />
                )}
              </div>
            )}
          </div>
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
