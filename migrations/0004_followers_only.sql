alter table hypeup_rule
  add column if not exists followers_only boolean not null default false;

create table if not exists hypeup_follow_gate (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  comment_id text not null,
  rule_id text not null,
  ig_from_username text,
  status text not null default 'pending',
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);

create index if not exists hypeup_follow_gate_user_status_idx
  on hypeup_follow_gate (user_id, status);
