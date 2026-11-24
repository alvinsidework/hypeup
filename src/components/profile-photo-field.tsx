import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { ghostBtn } from "@/components/lens-ui";
import { initial } from "@/lib/hypeup/format";
import {
  PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_DIMENSION,
} from "@/lib/hypeup/profile-photo";

const JPEG_PREFIX = "data:image/jpeg;base64,";
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

async function preparePhoto(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const photo = new window.Image();
    photo.src = source;
    await photo.decode();
    if (!photo.naturalWidth || !photo.naturalHeight)
      throw new Error("Invalid photo");
    const scale = Math.min(
      1,
      PROFILE_PHOTO_DIMENSION /
        Math.max(photo.naturalWidth, photo.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Invalid photo");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.78, 0.65, 0.5]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (!data.startsWith(JPEG_PREFIX)) break;
      const base64 = data.slice(JPEG_PREFIX.length);
      const bytes = base64.replace(/=+$/, "").length * 0.75;
      if (Math.floor(bytes) <= PROFILE_PHOTO_BYTES) return base64;
    }
    throw new Error("Photo too large");
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function ProfilePhotoField({
  name,
  savedAvatar,
  instagramAvatar,
  hasCustomPhoto,
  draft,
  preparing,
  onPreparing,
  onChange,
}: {
  name: string;
  savedAvatar: string | null;
  instagramAvatar: string | null;
  hasCustomPhoto: boolean;
  draft: string | null | undefined;
  preparing: boolean;
  onPreparing: (value: boolean) => void;
  onChange: (value: string | null | undefined) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source =
    draft === undefined
      ? savedAvatar
      : draft === null
        ? instagramAvatar
        : `${JPEG_PREFIX}${draft}`;

  async function choosePhoto(file: File) {
    setError(null);
    if (file.size > MAX_SOURCE_BYTES) {
      setError("20MB 이하의 사진을 선택해 주세요.");
      return;
    }
    if (file.type === "image/svg+xml") {
      setError("JPG, PNG, WebP 등 사진 파일을 선택해 주세요.");
      return;
    }
    onPreparing(true);
    try {
      onChange(await preparePhoto(file));
    } catch {
      setError("사진을 열 수 없어요. JPG, PNG 또는 WebP 파일을 선택해 주세요.");
    } finally {
      onPreparing(false);
    }
  }

  return (
    <div
      className="mt-4 flex items-center gap-4 rounded-md bg-surface-2 p-3.5 sm:gap-5 sm:p-4"
      aria-busy={preparing}
    >
      <div className="grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-3xl font-semibold text-muted">
        {source && source !== failedSource ? (
          <img
            src={source}
            alt=""
            className="size-full object-cover"
            onError={() => setFailedSource(source)}
          />
        ) : name.trim() ? (
          <span aria-hidden>{initial(name)}</span>
        ) : (
          <Camera className="size-6" strokeWidth={1.5} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">대표 이미지</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0">
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file && !preparing) void choosePhoto(file);
            }}
          />
          <button
            type="button"
            className={`${ghostBtn} min-h-11 bg-surface px-3`}
            disabled={preparing}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            {preparing ? "사진 준비 중" : "사진 선택"}
          </button>
          {typeof draft === "string" ||
          (draft === undefined && hasCustomPhoto) ? (
            <button
              type="button"
              className="lens-button lens-button-quiet min-h-11 px-2"
              disabled={preparing}
              onClick={() => {
                setError(null);
                onChange(hasCustomPhoto ? null : undefined);
              }}
            >
              기본 사진 사용
            </button>
          ) : draft === null && hasCustomPhoto ? (
            <button
              type="button"
              className="lens-button lens-button-quiet min-h-11 px-2"
              onClick={() => onChange(undefined)}
            >
              사진 변경 취소
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="mt-1 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
