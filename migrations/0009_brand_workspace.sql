create table if not exists hypeup_brand_account (
  brand_id text primary key references hypeup_brand (id) on delete cascade,
  auth_subject text not null unique,
  contract_cipher text
);

create table if not exists hypeup_brand_template (
  id text primary key,
  brand_id text not null references hypeup_brand_account (brand_id) on delete cascade,
  name text not null,
  terms jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists hypeup_brand_template_owner_idx on hypeup_brand_template (brand_id, updated_at desc);

create table if not exists hypeup_brand_favorite (
  brand_id text not null references hypeup_brand_account (brand_id) on delete cascade,
  user_id text not null references hypeup_page (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);

alter table hypeup_deal add column if not exists brand_contract_cipher text;
alter table hypeup_deal add column if not exists contract_parties jsonb;

alter table hypeup_brand_account enable row level security;
alter table hypeup_brand_template enable row level security;
alter table hypeup_brand_favorite enable row level security;
alter table hypeup_brand enable row level security;
alter table hypeup_thread enable row level security;
alter table hypeup_message enable row level security;
alter table hypeup_deal enable row level security;
alter table hypeup_settlement enable row level security;
alter table hypeup_record enable row level security;

create or replace function hypeup_deal_terms_frozen()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (new.terms is distinct from old.terms
    or new.brand_contract_cipher is distinct from old.brand_contract_cipher
    or new.contract_parties is distinct from old.contract_parties) then
    raise exception 'terms are frozen';
  end if;
  return new;
end;
$$;
