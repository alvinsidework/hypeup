alter table hypeup_page
  add column if not exists profile_layout text not null default 'magazine'
    check (profile_layout in ('sns', 'magazine'));
