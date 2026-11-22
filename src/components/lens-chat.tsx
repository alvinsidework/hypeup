import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ChevronDown, FileText, MessageCircle } from "lucide-react";
import { LensConfirm } from "@/components/lens-confirm";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { relativeTime } from "@/lib/hypeup/format";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";
import {
  FORMAT_LABEL,
  FORMATS,
  MODELS,
  addDays,
  canPropose,
  formatPercent,
  formatWon,
  priceLabel,
  rateToInput,
  statusLabel,
  todaySeoul,
  usageLabel,
  type DealFormat,
  type DealModel,
  type LensDeal,
  type Party,
  type TermsInput,
} from "@/lib/hypeup/lens-rules";

export type LensAction = {
  action:
    | "propose"
    | "agree"
    | "reject"
    | "withdraw"
    | "post"
    | "settle"
    | "paid"
    | "dispute"
    | "cancel"
    | "confirm_cancel";
  dealId?: string;
  terms?: TermsInput;
  url?: string;
  postedOn?: string;
  note?: string;
  amountKrw?: number;
  dueOn?: string;
  period?: string;
  salesKrw?: number | null;
  conversions?: number | null;
};

const MODEL_LABEL: Record<DealModel, string> = {
  fixed: "고정비",
  performance: "성과",
  hybrid: "혼합",
};

export function LensChat({
  role,
  desk,
  busy,
  onSend,
  onAction,
}: {
  role: Party;
  desk: ThreadDesk;
  busy: boolean;
  onSend: (body: string) => Promise<boolean>;
  onAction: (action: LensAction) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const latest = desk.messages.at(-1);
  const current = [...desk.deals]
    .reverse()
    .find((deal) => deal.status !== "cancelled" && deal.status !== "settled");
  const canCreateProposal = canPropose(desk.deals);

  useEffect(() => {
    const log = logRef.current;
    if (log && (followLatest.current || latest?.sender === role)) {
      log.scrollTop = log.scrollHeight;
    }
  }, [latest, role]);

  return (
    <div className="@container">
      <div className="grid items-start gap-6 @min-[47rem]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="lens-panel min-w-0">
          <h2 className="border-b border-border px-4 py-3.5 text-base font-semibold sm:px-5">
            대화
          </h2>
          <div
            ref={logRef}
            role="log"
            aria-label="브랜드 문의 대화"
            className="flex min-h-48 max-h-[min(50dvh,30rem)] flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-5"
            onScroll={(event) => {
              const log = event.currentTarget;
              followLatest.current =
                log.scrollHeight - log.scrollTop - log.clientHeight < 56;
            }}
          >
            {desk.messages.length === 0 ? (
              <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted">
                <MessageCircle
                  className="size-6"
                  strokeWidth={1.5}
                  aria-hidden
                />
                첫 메시지를 보내 보세요.
              </div>
            ) : null}
            {desk.messages.map((message) => {
              const system = message.sender === "system";
              const own = message.sender === role;
              return (
                <article
                  key={message.id}
                  className={
                    system
                      ? "mx-auto max-w-full text-center"
                      : own
                        ? "ml-auto max-w-[88%] text-right"
                        : "mr-auto max-w-[88%]"
                  }
                >
                  <p className="text-sm text-muted [overflow-wrap:anywhere]">
                    {system
                      ? "기록"
                      : message.sender === "brand"
                        ? desk.company
                        : desk.influencerName}
                    {" · "}
                    <time dateTime={message.createdAt}>
                      {relativeTime(message.createdAt)}
                    </time>
                  </p>
                  <p
                    className={`mt-1.5 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] ${system ? "text-muted" : own ? "rounded-2xl rounded-br-sm bg-accent-soft px-3.5 py-2.5 text-left" : "rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5"}`}
                  >
                    {message.body}
                  </p>
                  {message.terms ? (
                    <TermsCard
                      termsTitle={message.terms.title}
                      dealLike={message.terms}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
          <form
            className="flex items-end gap-2 border-t border-border px-3 py-3 sm:px-4"
            onSubmit={(event) => {
              event.preventDefault();
              const sent = body;
              const next = sent.trim();
              if (busy || !next) return;
              void onSend(next).then((success) => {
                if (success)
                  setBody((currentBody) =>
                    currentBody === sent ? "" : currentBody,
                  );
              });
            }}
          >
            <textarea
              className="lens-field min-h-12 max-h-36 min-w-0 flex-1 resize-none [field-sizing:content]"
              value={body}
              maxLength={2000}
              rows={1}
              placeholder="메시지 입력"
              aria-label="메시지"
              onChange={(event) => setBody(event.target.value)}
            />
            <button
              className="lens-button lens-button-primary min-w-12 shrink-0 !px-0"
              type="submit"
              aria-label={busy ? "처리 중" : "보내기"}
              disabled={busy || !body.trim()}
            >
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </form>
        </section>

        {desk.deals.length || canCreateProposal ? (
          <section className="min-w-0">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              협업 조건
            </h2>
            <div className="space-y-3">
              {desk.deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  role={role}
                  busy={busy}
                  active={current?.id === deal.id}
                  onAction={onAction}
                />
              ))}
              {canCreateProposal ? (
                <details className="lens-panel group px-4 sm:px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2.5">
                      <FileText className="size-5 text-muted" aria-hidden />{" "}
                      조건 제안
                    </span>
                    <ChevronDown
                      className="size-4 text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <ProposeForm
                    rates={desk.rates}
                    busy={busy}
                    onAction={onAction}
                  />
                </details>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function TermsCard({
  termsTitle,
  dealLike,
}: {
  termsTitle: string;
  dealLike: LensDeal["terms"];
}) {
  return (
    <div className="mt-2 rounded-lg bg-surface-2 px-3.5 py-3 text-left text-sm leading-relaxed text-muted">
      {termsTitle ? (
        <p className="mb-0.5 font-semibold text-fg">{termsTitle}</p>
      ) : null}
      <p>
        {FORMAT_LABEL[dealLike.format]} · {MODEL_LABEL[dealLike.deal_type]} ·{" "}
        {priceLabel({
          model: dealLike.deal_type,
          amountKrw: dealLike.pricing.fixed_amount_krw,
          rateBps: dealLike.pricing.performance_rate_bps,
        })}
      </p>
      <p>
        수정 {dealLike.revisions}회 · {usageLabel(dealLike.usage_rights_days)} ·
        잔금 {dealLike.payment_terms.balance_due_days_after_post}일
      </p>
    </div>
  );
}

function DealCard({
  deal,
  role,
  busy,
  active,
  onAction,
}: {
  deal: LensDeal;
  role: Party;
  busy: boolean;
  active: boolean;
  onAction: (action: LensAction) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [postedOn, setPostedOn] = useState(todaySeoul());
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(
    String(deal.terms.pricing.fixed_amount_krw ?? ""),
  );
  const [dueOn, setDueOn] = useState(
    addDays(
      deal.postedOn || todaySeoul(),
      deal.terms.payment_terms.balance_due_days_after_post,
    ),
  );
  const [period, setPeriod] = useState("");
  const [sales, setSales] = useState("");
  const [conversions, setConversions] = useState("");
  const performance = deal.terms.deal_type !== "fixed";

  return (
    <section className="lens-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
          {deal.title}
        </h3>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-sm text-muted">
          {statusLabel(deal.status)}
        </span>
        {role === "influencer" ? (
          <Link
            to="/deals/$id"
            params={{ id: deal.id }}
            className="lens-button lens-button-quiet ml-auto"
          >
            기록 보기
          </Link>
        ) : null}
      </div>
      <TermsCard termsTitle="" dealLike={deal.terms} />
      {deal.postUrl ? (
        <a
          className="mt-1 inline-flex min-h-11 items-center text-sm underline underline-offset-3 [overflow-wrap:anywhere]"
          href={deal.postUrl}
          target="_blank"
          rel="noreferrer"
        >
          {deal.postUrl}
        </a>
      ) : null}
      {deal.settlements.map((row) => (
        <p
          key={row.id}
          className="mt-2 text-sm text-muted [overflow-wrap:anywhere]"
        >
          {formatWon(row.amountKrw)} ·{" "}
          {row.status === "paid"
            ? "지급했다고 표시됨"
            : row.status === "disputed"
              ? "이견"
              : row.status === "requested"
                ? "요청"
                : row.status}
          {row.dueOn ? ` · 희망일 ${row.dueOn}` : ""}
          {row.note ? ` · ${row.note}` : ""}
        </p>
      ))}
      {deal.status === "settled" ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Lens가 입금을 확인한 것은 아닙니다.
        </p>
      ) : null}
      {active && deal.status === "draft" && deal.proposedBy !== role ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryBtn}
            disabled={busy}
            onClick={() => void onAction({ action: "agree", dealId: deal.id })}
          >
            이 조건으로 확정
          </button>
          <button
            type="button"
            className={ghostBtn}
            disabled={busy}
            onClick={() => void onAction({ action: "reject", dealId: deal.id })}
          >
            거절
          </button>
        </div>
      ) : null}
      {active && deal.status === "draft" && deal.proposedBy === role ? (
        <button
          type="button"
          className={`${ghostBtn} mt-3`}
          disabled={busy}
          onClick={() => void onAction({ action: "withdraw", dealId: deal.id })}
        >
          제안 철회
        </button>
      ) : null}
      {active && deal.status === "agreed" ? (
        <div className="mt-3 space-y-2">
          {deal.cancelRequestedBy && deal.cancelRequestedBy !== role ? (
            <button
              type="button"
              className={ghostBtn}
              disabled={busy}
              onClick={() =>
                void onAction({ action: "confirm_cancel", dealId: deal.id })
              }
            >
              취소에 동의
            </button>
          ) : null}
          {!deal.cancelRequestedBy ? (
            <button
              type="button"
              className={ghostBtn}
              disabled={busy}
              onClick={() =>
                void onAction({ action: "cancel", dealId: deal.id })
              }
            >
              게시 전 취소 요청
            </button>
          ) : null}
          {role === "influencer" ? (
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void onAction({
                  action: "post",
                  dealId: deal.id,
                  url,
                  postedOn,
                  note,
                });
              }}
            >
              <Field label="게시 링크">
                <input
                  className={inputClass}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://"
                />
              </Field>
              <Field label="게시일">
                <input
                  className={inputClass}
                  type="date"
                  value={postedOn}
                  onChange={(event) => setPostedOn(event.target.value)}
                />
              </Field>
              <Field label="메모">
                <input
                  className={inputClass}
                  value={note}
                  maxLength={280}
                  onChange={(event) => setNote(event.target.value)}
                />
              </Field>
              <button
                className={`${primaryBtn} sm:col-span-2`}
                type="submit"
                disabled={busy}
              >
                게시 링크 등록
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {active &&
      role === "influencer" &&
      (deal.status === "posted" || deal.status === "disputed") ? (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onAction({
              action: "settle",
              dealId: deal.id,
              amountKrw: Number(amount),
              dueOn,
              note,
              period,
              salesKrw: sales ? Number(sales) : null,
              conversions: conversions ? Number(conversions) : null,
            });
          }}
        >
          <Field label="정산 금액 (원)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="지급 희망일">
            <input
              className={inputClass}
              type="date"
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
            />
          </Field>
          {performance ? (
            <>
              <Field label="집계 기간">
                <input
                  className={inputClass}
                  value={period}
                  maxLength={80}
                  onChange={(event) => setPeriod(event.target.value)}
                />
              </Field>
              <Field label="주장하는 매출액">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={sales}
                  onChange={(event) => setSales(event.target.value)}
                />
              </Field>
              <Field label="주장하는 전환 수">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={conversions}
                  onChange={(event) => setConversions(event.target.value)}
                />
              </Field>
            </>
          ) : null}
          <Field label="메모">
            <input
              className={inputClass}
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          <button
            className={`${primaryBtn} sm:col-span-2`}
            type="submit"
            disabled={busy}
          >
            정산 요청
          </button>
        </form>
      ) : null}
      {active && deal.status === "settlement_requested" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {role === "brand" ? (
            <ConfirmPaid
              busy={busy}
              onConfirm={() =>
                void onAction({ action: "paid", dealId: deal.id })
              }
            />
          ) : null}
          <button
            type="button"
            className={ghostBtn}
            disabled={busy}
            onClick={() =>
              void onAction({ action: "dispute", dealId: deal.id, note })
            }
          >
            이견 남기기
          </button>
        </div>
      ) : null}
      {role === "brand" && deal.status === "disputed" ? (
        <div className="mt-3">
          <ConfirmPaid
            busy={busy}
            onConfirm={() => void onAction({ action: "paid", dealId: deal.id })}
          />
        </div>
      ) : null}
    </section>
  );
}

function ConfirmPaid({
  busy,
  onConfirm,
}: {
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <LensConfirm
      title="지급했다고 표시할까요?"
      description="Lens가 입금을 확인한 것은 아닙니다."
      confirmLabel="지급했다고 표시"
      destructive={false}
      onConfirm={onConfirm}
    >
      <button type="button" className={primaryBtn} disabled={busy}>
        지급했다고 표시
      </button>
    </LensConfirm>
  );
}

function ProposeForm({
  rates,
  busy,
  onAction,
}: {
  rates: ThreadDesk["rates"];
  busy: boolean;
  onAction: (action: LensAction) => Promise<void>;
}) {
  const [terms, setTerms] = useState<TermsInput>({
    title: "",
    format: "reel",
    model: "fixed",
    amountKrw: 300000,
    ratePercent: 15,
    deliverableCount: 1,
    description: "",
    revisions: 1,
    turnaroundDays: 7,
    usageDays: 90,
    balanceDays: 14,
    notes: "",
  });
  const patch = (partial: Partial<TermsInput>) =>
    setTerms((current) => ({ ...current, ...partial }));
  const showAmount = terms.model !== "performance";
  const showRate = terms.model !== "fixed";

  return (
    <form
      className="space-y-1 border-t border-border pt-2 pb-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onAction({ action: "propose", terms });
      }}
    >
      {rates.length ? (
        <Field label="단가에서 불러오기">
          <select
            className={inputClass}
            defaultValue=""
            onChange={(event) => {
              const rate = rates.find((item) => item.id === event.target.value);
              if (rate) setTerms(rateToInput(rate));
            }}
          >
            <option value="">직접 입력</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.title}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="제목">
        <input
          className={inputClass}
          value={terms.title}
          maxLength={80}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="형식">
          <select
            className={inputClass}
            value={terms.format}
            onChange={(event) =>
              patch({ format: event.target.value as DealFormat })
            }
          >
            {FORMATS.map((format) => (
              <option key={format} value={format}>
                {FORMAT_LABEL[format]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="유형">
          <select
            className={inputClass}
            value={terms.model}
            onChange={(event) =>
              patch({ model: event.target.value as DealModel })
            }
          >
            {MODELS.map((model) => (
              <option key={model} value={model}>
                {MODEL_LABEL[model]}
              </option>
            ))}
          </select>
        </Field>
        {showAmount ? (
          <Field label="금액 (원)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={terms.amountKrw ?? ""}
              onChange={(event) =>
                patch({ amountKrw: Number(event.target.value) })
              }
            />
          </Field>
        ) : null}
        {showRate ? (
          <Field label="수수료 (%)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={terms.ratePercent ?? ""}
              onChange={(event) =>
                patch({ ratePercent: Number(event.target.value) })
              }
            />
          </Field>
        ) : null}
        <Field label="수정 횟수">
          <input
            className={inputClass}
            inputMode="numeric"
            value={terms.revisions ?? 0}
            onChange={(event) =>
              patch({ revisions: Number(event.target.value) })
            }
          />
        </Field>
        <Field label="사용 기간 (일, 0이면 협의)">
          <input
            className={inputClass}
            inputMode="numeric"
            value={terms.usageDays ?? 0}
            onChange={(event) =>
              patch({ usageDays: Number(event.target.value) })
            }
          />
        </Field>
        <Field label="잔금 (게시 후 일)">
          <input
            className={inputClass}
            inputMode="numeric"
            value={terms.balanceDays ?? 14}
            onChange={(event) =>
              patch({ balanceDays: Number(event.target.value) })
            }
          />
        </Field>
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted tabular-nums">
        {showAmount ? formatWon(terms.amountKrw || 0) : ""}
        {showAmount && showRate ? " + " : ""}
        {showRate
          ? formatPercent(Math.round((terms.ratePercent || 0) * 100))
          : ""}
        {" · "}
        {usageLabel(terms.usageDays || 0)}
      </p>
      <button
        className={`${primaryBtn} mt-3 w-full sm:w-auto`}
        type="submit"
        disabled={busy}
      >
        조건 보내기
      </button>
    </form>
  );
}
