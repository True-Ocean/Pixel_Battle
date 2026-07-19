-- 公開プロフィールに「ひとこと」を追加
-- Supabase SQL Editor でこのファイル全体を実行してください。

alter table public.public_profiles
  add column if not exists profile_comment text;

alter table public.public_profiles
  drop constraint if exists public_profiles_profile_comment_length_check;

alter table public.public_profiles
  add constraint public_profiles_profile_comment_length_check
  check (
    profile_comment is null
    or char_length(profile_comment) <= 50
  );
