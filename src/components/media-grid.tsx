import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import type { MediaItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  IMAGE: "사진",
  VIDEO: "영상",
  CAROUSEL_ALBUM: "캐러셀",
  REELS: "릴스",
};

export function MediaGrid({ media }: { media: MediaItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {media.map((item, index) => (
        <Link
          key={item.id}
          to="/posts/$id"
          params={{ id: item.id }}
          className="group overflow-hidden rounded-lg border border-border bg-surface"
          style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}
        >
          <div className="relative aspect-square bg-surface-2">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="size-full bg-surface-2" />
            )}
            <span className="absolute left-2 top-2 rounded-sm bg-bg/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg">
              {TYPE_LABEL[item.mediaType] ?? item.mediaType}
            </span>
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-sm bg-bg/80 px-1.5 py-0.5 text-[11px] tabular-nums">
              <MessageCircle className="size-3" strokeWidth={1.5} />
              {item.commentsCount ?? 0}
            </span>
          </div>
          <p className={cn("truncate px-3 py-2.5 text-[12px] leading-5 text-muted")}>
            {item.caption || "캡션 없음"}
          </p>
        </Link>
      ))}
    </div>
  );
}
