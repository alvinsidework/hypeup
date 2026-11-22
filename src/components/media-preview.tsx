import { useCallback, useState } from "react";
import { ImageIcon, Play } from "lucide-react";
import type { MediaItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

type PreviewMedia = Pick<MediaItem, "mediaType" | "mediaUrl" | "thumbnailUrl">;

export function MediaPlaceholder({
  crossed = false,
  video = false,
}: {
  crossed?: boolean;
  video?: boolean;
}) {
  const Icon = video ? Play : ImageIcon;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-0 grid place-items-center overflow-hidden bg-surface-2 text-muted",
        crossed &&
          "before:absolute before:top-1/2 before:left-1/2 before:h-px before:w-[142%] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:bg-border after:absolute after:top-1/2 after:left-1/2 after:h-px after:w-[142%] after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:bg-border",
      )}
    >
      {!crossed ? <Icon className="size-6" strokeWidth={1.5} /> : null}
    </span>
  );
}

function isImageSource(src: string | null): src is string {
  return Boolean(
    src &&
    !/^(?:data:video\/)|\.(?:mp4|m4v|mov|webm|m3u8)(?:[?#]|$)/i.test(src),
  );
}

export function MediaPreview({
  media,
  eager = false,
  allowVideo = false,
  className,
}: {
  media: PreviewMedia;
  eager?: boolean;
  allowVideo?: boolean;
  className?: string;
}) {
  const { mediaType, mediaUrl, thumbnailUrl } = media;
  const video = mediaType === "REELS" || mediaType === "VIDEO";
  const imageSources = [
    isImageSource(thumbnailUrl) &&
    (!video ||
      thumbnailUrl !== mediaUrl ||
      thumbnailUrl.startsWith("data:image/"))
      ? thumbnailUrl
      : null,
    !video && thumbnailUrl !== mediaUrl && isImageSource(mediaUrl)
      ? mediaUrl
      : null,
  ].filter((source): source is string => Boolean(source));
  const videoSource =
    allowVideo && video && mediaUrl && !mediaUrl.startsWith("data:image/")
      ? mediaUrl
      : null;

  return (
    <span
      className={cn(
        "relative block aspect-square overflow-hidden bg-surface-2",
        className,
      )}
    >
      <Preview
        key={JSON.stringify([...imageSources, videoSource])}
        imageSources={imageSources}
        video={video}
        videoSource={videoSource}
        eager={eager}
      />
    </span>
  );
}

function Preview({
  imageSources,
  video,
  videoSource,
  eager,
}: {
  imageSources: string[];
  video: boolean;
  videoSource: string | null;
  eager: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [readySource, setReadySource] = useState<string | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const source = imageSources[index];

  const handleImage = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image?.complete) return;
      if (image.naturalWidth > 0) setReadySource(source);
      else setIndex((current) => (current === index ? current + 1 : current));
    },
    [index, source],
  );

  if (!source && videoSource && !videoFailed) {
    return (
      <video
        aria-label="게시물 영상"
        className="absolute inset-0 size-full object-contain"
        src={videoSource}
        controls
        playsInline
        preload="none"
        onError={() => setVideoFailed(true)}
      />
    );
  }

  const ready = Boolean(source && readySource === source);
  return (
    <>
      {!ready ? (
        <MediaPlaceholder video={video} crossed={Boolean(source)} />
      ) : null}
      {source ? (
        <img
          key={source}
          ref={handleImage}
          src={source}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onLoad={(event) => handleImage(event.currentTarget)}
          onError={() =>
            setIndex((current) => (current === index ? current + 1 : current))
          }
          className={cn(
            "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-200 motion-safe:group-hover:scale-[1.025]",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <span className="sr-only">미리보기 없음</span>
      )}
    </>
  );
}
