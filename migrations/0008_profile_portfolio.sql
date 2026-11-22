alter table hypeup_page
  add column if not exists profile_photo bytea,
  add column if not exists profile_photo_key text;

create unique index if not exists hypeup_page_profile_photo_idx
  on hypeup_page (profile_photo_key) where profile_photo_key is not null;

alter table hypeup_work
  add column if not exists instagram_media_id text,
  add column if not exists public_metrics text[] not null default '{}',
  add column if not exists view_count integer;

create unique index if not exists hypeup_work_instagram_media_idx
  on hypeup_work (user_id, instagram_media_id) where instagram_media_id is not null;
