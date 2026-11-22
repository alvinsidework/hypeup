import { useId, useRef, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { PenLine, RotateCcw, Upload, X } from "lucide-react";
import { ghostBtn, primaryBtn } from "@/components/lens-ui";
import { MAX_BRAND_SIGNATURE_LENGTH } from "@/lib/hypeup/brand-types";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const INK = "#17191e";

type Point = { x: number; y: number };

function boundedPng(canvas: HTMLCanvasElement): string {
  let current = canvas;
  let data = current.toDataURL("image/png");
  while (data.length > MAX_BRAND_SIGNATURE_LENGTH) {
    const next = document.createElement("canvas");
    next.width = Math.max(1, Math.floor(current.width * 0.75));
    next.height = Math.max(1, Math.floor(current.height * 0.75));
    const context = next.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했습니다.");
    context.drawImage(current, 0, 0, next.width, next.height);
    current = next;
    data = next.toDataURL("image/png");
  }
  return data;
}

async function normalizeUpload(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("10MB 이하의 이미지를 선택해 주세요.");
  }
  const prefix = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, i) => prefix[i] === byte,
  );
  const jpeg = prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255;
  if (!png && !jpeg) throw new Error("PNG 또는 JPEG 이미지를 선택해 주세요.");

  const url = URL.createObjectURL(file);
  try {
    const source = new Image();
    source.src = url;
    await source.decode();
    const scale = Math.min(
      1,
      960 / Math.max(source.naturalWidth, source.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했습니다.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return boundedPng(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BrandSignatureField({
  value,
  onChange,
  onUploadStateChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  onUploadStateChange: (uploading: boolean) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    onUploadStateChange(true);
    setUploadError("");
    try {
      onChange(await normalizeUpload(file));
    } catch {
      setUploadError(
        file.size > MAX_UPLOAD_BYTES
          ? "10MB 이하의 이미지를 선택해 주세요."
          : "서명을 불러오지 못했습니다. PNG 또는 JPEG 파일을 확인해 주세요.",
      );
    } finally {
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return (
    <section
      aria-labelledby={labelId}
      className="mt-6 border-t border-border pt-5"
    >
      <h3 id={labelId} className="text-base font-semibold">
        서명
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        선택 사항입니다. 양쪽이 계약 조건에 동의하면 계약 기록에 서명이
        포함됩니다.
      </p>
      {value ? (
        <img
          src={value}
          alt="등록한 서명"
          className="mt-3 h-30 w-full rounded-md border border-border bg-white object-contain p-2"
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <SignaturePad
          disabled={disabled || uploading}
          onUse={(signature) => {
            setUploadError("");
            onChange(signature);
          }}
        />
        <input
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          className="hidden"
          ref={fileInput}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void upload(file);
          }}
          aria-label="서명 이미지 파일"
        />
        <button
          type="button"
          className={ghostBtn}
          disabled={disabled || uploading}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="size-4 shrink-0" aria-hidden />
          {uploading ? "불러오는 중…" : "이미지 올리기"}
        </button>
        {value ? (
          <button
            type="button"
            className="lens-button lens-button-quiet"
            disabled={disabled || uploading}
            onClick={() => {
              setUploadError("");
              onChange(null);
            }}
          >
            서명 지우기
          </button>
        ) : null}
      </div>
      {uploadError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {uploadError}
        </p>
      ) : null}
    </section>
  );
}

function SignaturePad({
  disabled,
  onUse,
}: {
  disabled: boolean;
  onUse: (signature: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<{ pointerId: number; point: Point } | null>(null);

  function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    };
  }

  function startStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || stroke.current) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    canvas.setPointerCapture(event.pointerId);
    stroke.current = { pointerId: event.pointerId, point };
    context.fillStyle = INK;
    context.beginPath();
    context.arc(point.x, point.y, 2.25, 0, Math.PI * 2);
    context.fill();
    setHasInk(true);
  }

  function extendStroke(event: PointerEvent<HTMLCanvasElement>) {
    const previous = stroke.current;
    if (!previous || previous.pointerId !== event.pointerId) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = getPoint(event);
    context.strokeStyle = INK;
    context.lineWidth = 4.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previous.point.x, previous.point.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    stroke.current = { pointerId: event.pointerId, point };
  }

  function stopStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (stroke.current?.pointerId === event.pointerId) stroke.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    stroke.current = null;
    setHasInk(false);
    setError("");
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        clear();
        setOpen(next);
      }}
    >
      <Dialog.Trigger className={ghostBtn} disabled={disabled}>
        <PenLine className="size-4 shrink-0" aria-hidden /> 직접 그리기
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay z-[70]" />
        <Dialog.Content className="lens-sheet fixed inset-0 z-[80] m-auto h-fit max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-xl overflow-y-auto p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-bold tracking-tight">
                서명 그리기
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                흰색 영역에 손가락이나 마우스로 서명해 주세요.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="lens-icon-button"
              type="button"
              aria-label="서명 그리기 닫기"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-border bg-white">
            <canvas
              ref={canvasRef}
              width={768}
              height={288}
              className="block h-auto w-full touch-none cursor-crosshair"
              aria-label="서명 그리기 영역"
              role="img"
              onPointerDown={startStroke}
              onPointerMove={extendStroke}
              onPointerUp={(event) => {
                extendStroke(event);
                stopStroke(event);
              }}
              onPointerCancel={stopStroke}
              onLostPointerCapture={stopStroke}
            />
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={ghostBtn}
              onClick={clear}
              disabled={!hasInk}
            >
              <RotateCcw className="size-4" aria-hidden /> 다시 그리기
            </button>
            <button
              type="button"
              className={primaryBtn}
              disabled={!hasInk}
              onClick={() => {
                if (!canvasRef.current) return;
                try {
                  onUse(boundedPng(canvasRef.current));
                  clear();
                  setOpen(false);
                } catch {
                  setError("서명을 처리하지 못했습니다. 다시 그려 주세요.");
                }
              }}
            >
              이 서명 사용
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
