alter table hypeup_rule
  add column if not exists follow_opening_message text,
  add column if not exists follow_reminder_message text,
  add column if not exists follow_button_label text;
