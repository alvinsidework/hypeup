create table if not exists hypeup_known_follower (
  id text primary key,
  user_id text not null references hypeup_user (id) on delete cascade,
  ig_username text not null,
  sender_igsid text,
  confirmed_at timestamptz not null default now(),
  unique (user_id, ig_username)
);
