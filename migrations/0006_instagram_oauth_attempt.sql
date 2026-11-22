create table if not exists hypeup_oauth_attempt (
  state_hash text primary key,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  user_id text references hypeup_user (id) on delete cascade,
  error_code varchar(64),
  check (user_id is null or error_code is null)
);

alter table hypeup_oauth_attempt enable row level security;

create index if not exists hypeup_oauth_attempt_expires_idx
  on hypeup_oauth_attempt (expires_at);
