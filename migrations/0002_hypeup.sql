-- Hypeup app schema (Instagram-connected operators).
-- Separate from Better Auth's quoted "user" table.

create table if not exists hypeup_user (
  id text primary key,
  ig_user_id text not null unique,
  username text not null,
  name text,
  account_type text,
  profile_picture_url text,
  followers_count integer,
  media_count integer,
  token_cipher text,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  webhook_subscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hypeup_media (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  caption text,
  media_type text not null,
  media_url text,
  thumbnail_url text,
  permalink text,
  timestamp timestamptz,
  like_count integer,
  comments_count integer,
  updated_at timestamptz not null default now()
);

create index if not exists hypeup_media_user_id_idx on hypeup_media (user_id);

create table if not exists hypeup_comment (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  media_id text not null references hypeup_media (id) on delete cascade,
  parent_id text,
  ig_from_id text,
  ig_from_username text,
  text text not null,
  timestamp timestamptz,
  hidden boolean not null default false,
  replied_public boolean not null default false,
  replied_private boolean not null default false,
  automation_processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hypeup_comment_user_id_idx on hypeup_comment (user_id);
create index if not exists hypeup_comment_media_id_idx on hypeup_comment (media_id);

create table if not exists hypeup_rule (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  scope text not null,
  media_id text,
  match_mode text not null,
  keywords text[] not null default '{}',
  exclude_keywords text[] not null default '{}',
  public_replies text[] not null default '{}',
  dm_message text,
  hide_comment boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hypeup_rule_user_id_idx on hypeup_rule (user_id);

create table if not exists hypeup_event_log (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  type text not null,
  success boolean not null,
  comment_id text,
  media_id text,
  rule_id text,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hypeup_event_log_user_created_idx
  on hypeup_event_log (user_id, created_at desc);
