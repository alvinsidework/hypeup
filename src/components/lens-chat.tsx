import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
  action: "propose" | "agree" | "reject" | "withdraw" | "post" | "settle" | "paid" | "dispute" | "cancel" | "confirm_cancel";
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

const MODEL_LABEL: Record<DealModel, string> = { fixed: "고정비", performance: "성과", hybrid: "혼합" };

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
  onSend: (body: string) => Promise<void>;
  onAction: (action: LensAction) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const current = [...desk.deals].reverse().find((deal) => deal.status !== "cancelled" && deal.status !== "settled");

  return (
    <div>
      <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-surface p-4">
        {desk.messages.map((message) => (
          <article key={message.id} className={message.sender === "system" ? "text-center" : message.sender === role ? "ml-8" : "mr-8"}>
            <p className="text-[11px] text-subtle">
              {message.sender === "system" ? "기록" : message.sender === "brand" ? desk.company : desk.influencerName}
              {" · "}
              {relativeTime(message.createdAt)}
            </p>
            <p className={`mt-1 text-[13px] leading-6 ${message.sender === "system" ? "text-muted" : "rounded-md border border-border bg-bg px-3 py-2"}`}>
              {message.body}
            </p>
            {message.terms ? <TermsCard termsTitle={message.terms.title} dealLike={message.terms} /> : null}
          </article>
        ))}
      </div>

      {desk.deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} role={role} busy={busy} active={current?.id === deal.id} onAction={onAction} />
      ))}

      {canPropose(desk.deals) ? <ProposeForm rates={desk.rates} busy={busy} onAction={onAction} /> : null}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = body.trim();
          if (!next) return;
          void onSend(next).then(() => setBody(""));
        }}
      >
        <input className={inputClass} value={body} maxLength={2000} placeholder="메시지" onChange={(event) => setBody(event.target.value)} />
        <button className={primaryBtn} type="submit" disabled={busy || !body.trim()}>
          보내기
        </button>
      </form>
    </div>
  );
}

function TermsCard({ termsTitle, dealLike }: { termsTitle: string; dealLike: LensDeal["terms"] }) {
  return (
    <div className="mt-2 rounded-md border border-border bg-bg px-3 py-2 text-[12px] leading-5 text-muted">
      <p className="text-[13px] text-fg">{termsTitle}</p>
      <p>
        {FORMAT_LABEL[dealLike.format]} · {MODEL_LABEL[dealLike.deal_type]} ·{" "}
        {priceLabel({
          model: dealLike.deal_type,
          amountKrw: dealLike.pricing.fixed_amount_krw,
          rateBps: dealLike.pricing.performance_rate_bps,
        })}
      </p>
      <p>
        수정 {dealLike.revisions}회 · {usageLabel(dealLike.usage_rights_days)} · 잔금 {dealLike.payment_terms.balance_due_days_after_post}일
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
  const [amount, setAmount] = useState(String(deal.terms.pricing.fixed_amount_krw ?? ""));
  const [dueOn, setDueOn] = useState(addDays(deal.postedOn || todaySeoul(), deal.terms.payment_terms.balance_due_days_after_post));
  const [period, setPeriod] = useState("");
  const [sales, setSales] = useState("");
  const [conversions, setConversions] = useState("");
  const performance = deal.terms.deal_type !== "fixed";

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-medium">{deal.title}</h2>
        <span className="rounded-md border border-border px-2 py-0.5 text-[11px]">{statusLabel(deal.status)}</span>
        {role === "influencer" ? (
          <Link to="/deals/$id" params={{ id: deal.id }} className="text-[12px] text-muted underline">
            기록 보기
          </Link>
        ) : null}
      </div>
      <TermsCard termsTitle={deal.title} dealLike={deal.terms} />
      {deal.postUrl ? (
        <a className="mt-2 block text-[12px] underline" href={deal.postUrl} target="_blank" rel="noreferrer">
          {deal.postUrl}
        </a>
      ) : null}
      {deal.settlements.map((row) => (
        <p key={row.id} className="mt-2 text-[12px] text-muted">
          {formatWon(row.amountKrw)} · {row.status === "paid" ? "지급했다고 표시됨" : row.status === "disputed" ? "이견" : row.status === "requested" ? "요청" : row.status}
          {row.dueOn ? ` · 희망일 ${row.dueOn}` : ""}
          {row.note ? ` · ${row.note}` : ""}
        </p>
      ))}
      {deal.status === "settled" ? (
        <p className="mt-2 text-[12px] leading-5 text-muted">Lens가 입금을 확인한 것은 아닙니다.</p>
      ) : null}
      {active && deal.status === "draft" && deal.proposedBy !== role ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={primaryBtn} disabled={busy} onClick={() => void onAction({ action: "agree", dealId: deal.id })}>
            이 조건으로 확정
          </button>
          <button type="button" className={ghostBtn} disabled={busy} onClick={() => void onAction({ action: "reject", dealId: deal.id })}>
            거절
          </button>
        </div>
      ) : null}
      {active && deal.status === "draft" && deal.proposedBy === role ? (
        <button type="button" className={`${ghostBtn} mt-3`} disabled={busy} onClick={() => void onAction({ action: "withdraw", dealId: deal.id })}>
          제안 철회
        </button>
      ) : null}
      {active && deal.status === "agreed" ? (
        <div className="mt-3 space-y-2">
          {deal.cancelRequestedBy && deal.cancelRequestedBy !== role ? (
            <button type="button" className={ghostBtn} disabled={busy} onClick={() => void onAction({ action: "confirm_cancel", dealId: deal.id })}>
              취소에 동의
            </button>
          ) : null}
          {!deal.cancelRequestedBy ? (
            <button type="button" className={ghostBtn} disabled={busy} onClick={() => void onAction({ action: "cancel", dealId: deal.id })}>
              게시 전 취소 요청
            </button>
          ) : null}
          {role === "influencer" ? (
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void onAction({ action: "post", dealId: deal.id, url, postedOn, note });
              }}
            >
              <Field label="게시 링크">
                <input className={inputClass} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
              </Field>
              <Field label="게시일">
                <input className={inputClass} type="date" value={postedOn} onChange={(event) => setPostedOn(event.target.value)} />
              </Field>
              <Field label="메모">
                <input className={inputClass} value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} />
              </Field>
              <button className={`${primaryBtn} sm:col-span-2`} type="submit" disabled={busy}>
                게시 링크 등록
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {active && role === "influencer" && (deal.status === "posted" || deal.status === "disputed") ? (
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
            <input className={inputClass} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="지급 희망일">
            <input className={inputClass} type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
          </Field>
          {performance ? (
            <>
              <Field label="집계 기간">
                <input className={inputClass} value={period} maxLength={80} onChange={(event) => setPeriod(event.target.value)} />
              </Field>
              <Field label="주장하는 매출액">
                <input className={inputClass} inputMode="numeric" value={sales} onChange={(event) => setSales(event.target.value)} />
              </Field>
              <Field label="주장하는 전환 수">
                <input className={inputClass} inputMode="numeric" value={conversions} onChange={(event) => setConversions(event.target.value)} />
              </Field>
            </>
          ) : null}
          <Field label="메모">
            <input className={inputClass} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <button className={`${primaryBtn} sm:col-span-2`} type="submit" disabled={busy}>
            정산 요청
          </button>
        </form>
      ) : null}
      {active && deal.status === "settlement_requested" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {role === "brand" ? (
            <button
              type="button"
              className={primaryBtn}
              disabled={busy}
              onClick={() => {
                if (!window.confirm("지급했다고 표시합니다. Lens가 입금을 확인한 것은 아닙니다.")) return;
                void onAction({ action: "paid", dealId: deal.id });
              }}
            >
              지급했다고 표시
            </button>
          ) : null}
          <button type="button" className={ghostBtn} disabled={busy} onClick={() => void onAction({ action: "dispute", dealId: deal.id, note })}>
            이견 남기기
          </button>
        </div>
      ) : null}
      {role === "brand" && deal.status === "disputed" ? (
        <button
          type="button"
          className={`${primaryBtn} mt-3`}
          disabled={busy}
          onClick={() => {
            if (!window.confirm("지급했다고 표시합니다. Lens가 입금을 확인한 것은 아닙니다.")) return;
            void onAction({ action: "paid", dealId: deal.id });
          }}
        >
          지급했다고 표시
        </button>
      ) : null}
    </section>
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
  const patch = (partial: Partial<TermsInput>) => setTerms((current) => ({ ...current, ...partial }));
  const showAmount = terms.model !== "performance";
  const showRate = terms.model !== "fixed";

  return (
    <form
      className="mt-4 rounded-lg border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onAction({ action: "propose", terms });
      }}
    >
      <p className="text-[13px] font-medium">조건 제안</p>
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
        <input className={inputClass} value={terms.title} maxLength={80} onChange={(event) => patch({ title: event.target.value })} />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="형식">
          <select className={inputClass} value={terms.format} onChange={(event) => patch({ format: event.target.value as DealFormat })}>
            {FORMATS.map((format) => (
              <option key={format} value={format}>
                {FORMAT_LABEL[format]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="유형">
          <select className={inputClass} value={terms.model} onChange={(event) => patch({ model: event.target.value as DealModel })}>
            {MODELS.map((model) => (
              <option key={model} value={model}>
                {MODEL_LABEL[model]}
              </option>
            ))}
          </select>
        </Field>
        {showAmount ? (
          <Field label="금액 (원)">
            <input className={inputClass} inputMode="numeric" value={terms.amountKrw ?? ""} onChange={(event) => patch({ amountKrw: Number(event.target.value) })} />
          </Field>
        ) : null}
        {showRate ? (
          <Field label="수수료 (%)">
            <input className={inputClass} inputMode="decimal" value={terms.ratePercent ?? ""} onChange={(event) => patch({ ratePercent: Number(event.target.value) })} />
          </Field>
        ) : null}
        <Field label="수정 횟수">
          <input className={inputClass} inputMode="numeric" value={terms.revisions ?? 0} onChange={(event) => patch({ revisions: Number(event.target.value) })} />
        </Field>
        <Field label="사용 기간 (일, 0이면 협의)">
          <input className={inputClass} inputMode="numeric" value={terms.usageDays ?? 0} onChange={(event) => patch({ usageDays: Number(event.target.value) })} />
        </Field>
        <Field label="잔금 (게시 후 일)">
          <input className={inputClass} inputMode="numeric" value={terms.balanceDays ?? 14} onChange={(event) => patch({ balanceDays: Number(event.target.value) })} />
        </Field>
      </div>
      <p className="mt-2 text-[12px] text-muted">
        {showAmount ? formatWon(terms.amountKrw || 0) : ""}
        {showAmount && showRate ? " + " : ""}
        {showRate ? formatPercent(Math.round((terms.ratePercent || 0) * 100)) : ""}
        {" · "}
        {usageLabel(terms.usageDays || 0)}
      </p>
      <button className={`${primaryBtn} mt-3`} type="submit" disabled={busy}>
        조건 보내기
      </button>
    </form>
  );
}
