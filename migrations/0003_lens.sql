-- Public page, rates, portfolio, and recorded brand inquiries.
-- Existing hypeup_* Instagram tables stay as they are.

create table if not exists hypeup_page (
  user_id text primary key references hypeup_user (id) on delete cascade,
  username text,
  display_name text not null default '',
  bio text not null default '',
  categories text[] not null default '{}',
  instagram_handle text,
  instagram_followers integer,
  tiktok_handle text,
  tiktok_followers integer,
  youtube_handle text,
  youtube_followers integer,
  links jsonb not null default '[]',
  is_public boolean not null default false,
  notify_email boolean not null default true,
  bank_name text,
  account_cipher text,
  account_last4 text,
  account_holder text,
  updated_at timestamptz not null default now(),
  constraint hypeup_page_username_chk check (
    username is null or username ~ '^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$'
  )
);

create unique index if not exists hypeup_page_username_idx on hypeup_page (username);

create table if not exists hypeup_rate (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  sort_order integer not null default 0,
  format text not null,
  title text not null,
  model text not null,
  amount_krw integer,
  rate_bps integer,
  price_hidden boolean not null default false,
  deliverable_count integer not null default 1,
  description text not null default '',
  revisions integer not null default 0,
  turnaround_days integer not null default 7,
  usage_days integer not null default 0,
  paid_ads boolean not null default false,
  raw_files boolean not null default false,
  exclusivity_days integer not null default 0,
  exclusivity_category text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists hypeup_rate_user_idx on hypeup_rate (user_id, sort_order);

create table if not exists hypeup_work (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  brand_name text,
  channel text not null,
  format text not null,
  post_url text,
  cover_url text,
  posted_month text,
  highlight_label text,
  highlight_value text,
  stats jsonb not null default '[]',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists hypeup_work_user_idx on hypeup_work (user_id, sort_order);

create table if not exists hypeup_brand (
  id text primary key,
  email text not null unique,
  contact_name text not null,
  company text not null,
  instagram_handle text,
  biz_no text,
  trust text not null,
  created_at timestamptz not null default now()
);

create table if not exists hypeup_thread (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  brand_id text not null references hypeup_brand (id),
  company_name text not null default '',
  archived boolean not null default false,
  unread_count integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, brand_id)
);

create index if not exists hypeup_thread_user_idx on hypeup_thread (user_id, last_message_at desc);

create table if not exists hypeup_message (
  id text primary key,
  thread_id text not null references hypeup_thread (id) on delete cascade,
  sender text not null,
  body text not null,
  kind text not null default 'text',
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint hypeup_message_sender_chk check (sender in ('influencer', 'brand', 'system')),
  constraint hypeup_message_kind_chk check (kind in ('text', 'terms', 'system'))
);

create index if not exists hypeup_message_thread_idx on hypeup_message (thread_id, created_at);

create table if not exists hypeup_deal (
  id text primary key,
  thread_id text not null references hypeup_thread (id) on delete cascade,
  user_id text not null references hypeup_user (id) on delete cascade,
  status text not null,
  title text not null,
  terms jsonb not null,
  proposed_by text not null,
  influencer_agreed_at timestamptz,
  brand_agreed_at timestamptz,
  agreed_at timestamptz,
  cancel_requested_by text,
  post_url text,
  posted_on date,
  post_note text,
  created_at timestamptz not null default now(),
  constraint hypeup_deal_status_chk check (
    status in ('draft', 'agreed', 'posted', 'settlement_requested', 'settled', 'disputed', 'cancelled')
  ),
  constraint hypeup_deal_proposed_chk check (proposed_by in ('influencer', 'brand'))
);

create index if not exists hypeup_deal_thread_idx on hypeup_deal (thread_id, created_at);

create table if not exists hypeup_settlement (
  id text primary key,
  deal_id text not null references hypeup_deal (id) on delete cascade,
  status text not null,
  amount_krw integer not null,
  due_on date,
  note text,
  period_label text,
  claimed_sales_krw integer,
  claimed_conversions integer,
  created_at timestamptz not null default now(),
  constraint hypeup_settlement_status_chk check (
    status in ('requested', 'acknowledged', 'paid', 'disputed', 'superseded')
  )
);

create unique index if not exists hypeup_settlement_open_idx
  on hypeup_settlement (deal_id)
  where status in ('requested', 'acknowledged');

create table if not exists hypeup_record (
  id text primary key,
  deal_id text not null references hypeup_deal (id) on delete cascade,
  hash text not null,
  body jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function hypeup_message_no_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'messages are immutable';
end;
$$;

drop trigger if exists hypeup_message_no_update_trg on hypeup_message;
create trigger hypeup_message_no_update_trg
  before update on hypeup_message
  for each row execute function hypeup_message_no_update();

create or replace function hypeup_deal_terms_frozen()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and new.terms is distinct from old.terms then
    raise exception 'terms are frozen';
  end if;
  return new;
end;
$$;

drop trigger if exists hypeup_deal_terms_frozen_trg on hypeup_deal;
create trigger hypeup_deal_terms_frozen_trg
  before update on hypeup_deal
  for each row execute function hypeup_deal_terms_frozen();

create or replace function hypeup_settlement_amount_frozen()
returns trigger
language plpgsql
as $$
begin
  if new.amount_krw is distinct from old.amount_krw then
    raise exception 'settlement amount is frozen';
  end if;
  return new;
end;
$$;

drop trigger if exists hypeup_settlement_amount_frozen_trg on hypeup_settlement;
create trigger hypeup_settlement_amount_frozen_trg
  before update on hypeup_settlement
  for each row execute function hypeup_settlement_amount_frozen();
