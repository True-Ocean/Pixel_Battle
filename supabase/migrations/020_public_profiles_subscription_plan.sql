-- 公開プロフィールに現在のサブスクリプションプランを追加
-- Supabase SQL Editor でこのファイル全体を実行してください。

alter table public.public_profiles
  add column if not exists subscription_plan text not null default 'none';

alter table public.public_profiles
  drop constraint if exists public_profiles_subscription_plan_check;

alter table public.public_profiles
  add constraint public_profiles_subscription_plan_check
  check (subscription_plan in ('none', 'light', 'premium'));
