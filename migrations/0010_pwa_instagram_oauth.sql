create table if not exists hypeup_pwa_oauth_attempt (
  id text primary key,
  initiating_origin text not null,
  launch_hash text not null unique,
  claim_hash text not null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  launched boolean not null default false,
  user_id text references hypeup_user (id) on delete cascade,
  error_code varchar(64),
  check (user_id is null or error_code is null)
);

alter table hypeup_pwa_oauth_attempt enable row level security;

create index if not exists hypeup_pwa_oauth_attempt_expires_idx
  on hypeup_pwa_oauth_attempt (expires_at);
