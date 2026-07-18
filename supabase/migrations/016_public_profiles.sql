-- 公開ユーザープロフィール
-- Supabase SQL Editor でこのファイル全体を実行してください。
-- ユーザー名は一意識別子にせず、auth.users.id (owner_id) で参照します。

create table if not exists public.public_profiles (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(btrim(username)) > 0),
  avatar jsonb check (avatar is null or jsonb_typeof(avatar) = 'object'),
  level integer not null check (level >= 1),
  cpu_battle_wins integer not null default 0 check (cpu_battle_wins >= 0),
  cpu_battle_losses integer not null default 0 check (cpu_battle_losses >= 0),
  offline_pvp_battle_wins integer not null default 0
    check (offline_pvp_battle_wins >= 0),
  offline_pvp_battle_losses integer not null default 0
    check (offline_pvp_battle_losses >= 0),
  online_pvp_battle_wins integer not null default 0
    check (online_pvp_battle_wins >= 0),
  online_pvp_battle_losses integer not null default 0
    check (online_pvp_battle_losses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

-- プロフィールはログイン済みユーザー同士で閲覧可能
drop policy if exists "public_profiles_select" on public.public_profiles;
create policy "public_profiles_select"
  on public.public_profiles
  for select
  to authenticated
  using (true);

-- 作成・更新・削除は本人の行だけ許可
drop policy if exists "public_profiles_insert_own" on public.public_profiles;
create policy "public_profiles_insert_own"
  on public.public_profiles
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "public_profiles_update_own" on public.public_profiles;
create policy "public_profiles_update_own"
  on public.public_profiles
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "public_profiles_delete_own" on public.public_profiles;
create policy "public_profiles_delete_own"
  on public.public_profiles
  for delete
  to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on table public.public_profiles
  to authenticated;
