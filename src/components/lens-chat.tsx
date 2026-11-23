import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUp,
  ChevronDown,
  FileText,
  LoaderCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LensConfirm } from "@/components/lens-confirm";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { ProposalFields } from "@/components/proposal-form";
import type { BrandProposalTemplate } from "@/lib/hypeup/brand-types";
import { relativeTime } from "@/lib/hypeup/format";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";
import {
  EMPTY_PROPOSAL,
  FORMAT_LABEL,
  MODEL_LABEL,
  addDays,
  canPropose,
  formatDay,
  formatWon,
  parseTerms,
  priceLabel,
  proposalAddOnRows,
  rateToInput,
  statusLabel,
  termsToInput,
  todaySeoul,
  usageLabel,
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

type SaveProposalTemplate = (
  name: string,
  terms: TermsInput,
) => Promise<boolean>;

const contractAttachmentCopy =
  "양쪽이 조건에 합의하면 저장한 계약 정보와 서명이 계약서에 첨부됩니다.";

export function LensChat({
  role,
  desk,
  busy,
  onSend,
  onAction,
  proposalTemplates,
  onSaveProposalTemplate,
}: {
  role: Party;
  desk: ThreadDesk;
  busy: boolean;
  onSend: (body: string) => Promise<boolean>;
  onAction: (action: LensAction) => Promise<void>;
  proposalTemplates?: BrandProposalTemplate[];
  onSaveProposalTemplate?: SaveProposalTemplate;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const sendPending = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const latestId = desk.messages.at(-1)?.id;
  const latestSender = desk.messages.at(-1)?.sender;
  const current = [...desk.deals]
    .reverse()
    .find((deal) => deal.status !== "cancelled" && deal.status !== "settled");
  const canCreateProposal = canPropose(desk.deals);

  useEffect(() => {
    const log = logRef.current;
    if (log && (followLatest.current || latestSender === role)) {
      log.scrollTop = log.scrollHeight;
    }
  }, [latestId, latestSender, role]);

  async function sendMessage() {
    const draft = body;
    const message = draft.trim();
    if (busy || sendPending.current || !message) return;

    sendPending.current = true;
    setSending(true);
    try {
      if (await onSend(message)) {
        setBody((currentBody) => (currentBody === draft ? "" : currentBody));
      }
    } catch {
      toast.error("메시지를 보내지 못했습니다. 다시 시도해 주세요.");
    } finally {
      sendPending.current = false;
      setSending(false);
    }
  }

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
              void sendMessage();
            }}
          >
            <textarea
              className="lens-field min-h-12 max-h-36 min-w-0 flex-1 resize-none [field-sizing:content]"
              value={body}
              maxLength={2000}
              rows={1}
              placeholder="메시지 입력"
              aria-label="메시지"
              enterKeyHint="send"
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing ||
                  event.nativeEvent.keyCode === 229
                )
                  return;
                event.preventDefault();
                if (!event.repeat) event.currentTarget.form?.requestSubmit();
              }}
            />
            <button
              className="lens-button lens-button-primary min-w-12 shrink-0 !px-0"
              type="submit"
              aria-label={sending ? "메시지 보내는 중" : "보내기"}
              aria-busy={sending}
              disabled={busy || sending || !body.trim()}
            >
              {sending ? (
                <LoaderCircle
                  className="size-5 motion-safe:animate-spin"
                  aria-hidden
                />
              ) : (
                <ArrowUp className="size-5" aria-hidden />
              )}
            </button>
          </form>
        </section>

        {desk.deals.length || canCreateProposal ? (
          <section className="min-w-0">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              협업 조건
            </h2>
            <div className="space-y-3">
              {canCreateProposal ? (
                <details className="lens-panel group px-4 sm:px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2.5">
                      <FileText className="size-5 text-muted" aria-hidden />{" "}
                      {desk.deals.length ? "새 조건 제안" : "조건 제안"}
                    </span>
                    <ChevronDown
                      className="size-4 text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <ProposeForm
                    rates={desk.rates}
                    role={role}
                    busy={busy}
                    onAction={onAction}
                    templates={proposalTemplates}
                    onSaveTemplate={onSaveProposalTemplate}
                  />
                </details>
              ) : null}
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
  const addOns = proposalAddOnRows(dealLike.addOns);
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
      {addOns.length > 0 ? (
        <div className="mt-2.5 border-t border-border pt-2.5">
          <p className="mb-1 text-sm font-semibold text-fg">추가 옵션</p>
          <dl className="space-y-1">
            {addOns.map(({ id, label, details, amountKrw }) => (
              <div
                key={id}
                className="flex flex-wrap justify-between gap-x-2 [overflow-wrap:anywhere]"
              >
                <dt className="min-w-0 text-fg">{label}</dt>
                <dd className="min-w-0 tabular-nums">
                  {[details, amountKrw == null ? "" : formatWon(amountKrw)]
                    .filter(Boolean)
                    .join(" · ") || "포함"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
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
      {deal.agreedAt ? <BrandContractCard deal={deal} /> : null}
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
          {role === "brand" ? (
            <p className="basis-full text-sm text-muted">
              {contractAttachmentCopy}
            </p>
          ) : null}
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
          {deal.cancelRequestedBy ? (
            <p className="text-sm leading-relaxed text-muted">
              {deal.cancelRequestedBy === role
                ? "상대방이 취소에 동의하면 새 조건을 제안할 수 있어요."
                : "상대방이 게시 전 취소를 요청했어요. 동의하면 새 조건을 제안할 수 있어요."}
            </p>
          ) : null}
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

function BrandContractCard({ deal }: { deal: LensDeal }) {
  const contract = deal.brandContract;
  const personal = contract?.kind === "individual";
  const details = contract
    ? [
        [personal ? "성명" : "법인명 또는 상호", contract.legalName],
        [
          personal ? "생년월일" : "사업자등록번호",
          personal
            ? formatDay(contract.birthDate)
            : contract.registrationNumber,
        ],
        ["연락처", contract.phone],
        ["주소", contract.address],
      ].filter(([, value]) => value)
    : [];

  return (
    <div className="mt-3">
      {contract ? (
        <details className="group/contract rounded-xl border border-border px-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            브랜드 계약 정보
            <ChevronDown
              className="size-4 text-muted transition-transform group-open/contract:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-border py-3">
            <dl className="grid gap-2 text-sm [overflow-wrap:anywhere]">
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(4rem,auto)_1fr] gap-2"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {contract.signature ? (
              <figure className="mt-3">
                <figcaption className="mb-1.5 text-sm text-muted">
                  첨부 서명
                </figcaption>
                <img
                  src={contract.signature}
                  loading="lazy"
                  alt="브랜드 서명"
                  className="max-h-28 max-w-full rounded-lg border border-border bg-white object-contain"
                />
              </figure>
            ) : null}
          </div>
        </details>
      ) : null}
      <Link
        to="/brand/contract/$id"
        params={{ id: deal.id }}
        className={`${ghostBtn} mt-2`}
      >
        <FileText className="size-4" aria-hidden />
        계약서 보기
      </Link>
    </div>
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
  role,
  busy,
  onAction,
  templates,
  onSaveTemplate,
}: {
  rates: ThreadDesk["rates"];
  role: Party;
  busy: boolean;
  onAction: (action: LensAction) => Promise<void>;
  templates?: BrandProposalTemplate[];
  onSaveTemplate?: SaveProposalTemplate;
}) {
  const [terms, setTerms] = useState<TermsInput>(EMPTY_PROPOSAL);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const savePending = useRef(false);
  const saveDetailsRef = useRef<HTMLDetailsElement>(null);
  const showPicker = rates.length > 0 || Boolean(templates?.length);

  async function saveTemplate() {
    const name = templateName.trim();
    if (!name || !onSaveTemplate || busy || savePending.current) return;
    const parsed = parseTerms(terms);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    savePending.current = true;
    setSaving(true);
    try {
      if (await onSaveTemplate(name, termsToInput(parsed.terms))) {
        setTemplateName("");
        if (saveDetailsRef.current) saveDetailsRef.current.open = false;
      }
    } catch {
      toast.error("제안서 템플릿을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-2 pb-5">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || saving) return;
          const parsed = parseTerms(terms);
          if (!parsed.ok) {
            toast.error(parsed.error);
            return;
          }
          void onAction({
            action: "propose",
            terms: termsToInput(parsed.terms),
          });
        }}
      >
        {showPicker ? (
          <Field label="협업 조건 불러오기">
            <select
              className={inputClass}
              defaultValue=""
              disabled={busy || saving}
              onChange={(event) => {
                const select = event.currentTarget;
                const template = templates?.find(
                  ({ id }) => `template:${id}` === select.value,
                );
                const rate = rates.find(
                  ({ id }) => `rate:${id}` === select.value,
                );
                if (template) setTerms(template.terms);
                if (rate) setTerms(rateToInput(rate));
                select.value = "";
              }}
            >
              <option value="">선택하기</option>
              {templates?.length ? (
                <optgroup label="저장한 제안서 템플릿">
                  {templates.map(({ id, name }) => (
                    <option key={id} value={`template:${id}`}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {rates.length ? (
                <optgroup label="등록된 단가">
                  {rates.map(({ id, title }) => (
                    <option key={id} value={`rate:${id}`}>
                      {title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </Field>
        ) : null}
        <ProposalFields
          value={terms}
          onChange={setTerms}
          disabled={busy || saving}
        />
        {role === "brand" ? (
          <p className="mt-3 text-sm text-muted">{contractAttachmentCopy}</p>
        ) : null}
        <button
          className={`${primaryBtn} mt-3 w-full sm:w-auto`}
          type="submit"
          disabled={busy || saving}
        >
          조건 보내기
        </button>
      </form>
      {onSaveTemplate ? (
        <details
          ref={saveDetailsRef}
          className="group/template rounded-xl border border-border px-3"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            제안서 템플릿으로 저장
            <ChevronDown
              className="size-4 text-muted transition-transform group-open/template:rotate-180"
              aria-hidden
            />
          </summary>
          <form
            className="border-t border-border pb-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTemplate();
            }}
          >
            <Field label="템플릿 이름">
              <input
                className={inputClass}
                required
                maxLength={60}
                value={templateName}
                disabled={busy || saving}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </Field>
            <button
              className={`${ghostBtn} mt-3`}
              type="submit"
              disabled={busy || saving || !templateName.trim()}
              aria-busy={saving}
            >
              {saving ? (
                <LoaderCircle
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden
                />
              ) : null}
              템플릿 저장
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
