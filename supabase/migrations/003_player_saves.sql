-- アカウント連携用クラウドセーブ
-- SQL Editor で実行してください（001 / 002 を実行済みのプロジェクト向け）

create table if not exists public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save_json jsonb not null,
  updated_at timestamptz not null default now(),
  client_updated_at timestamptz not null
);

create index if not exists player_saves_updated_at_idx
  on public.player_saves (updated_at desc);

alter table public.player_saves enable row level security;

create policy "player_saves_select_own"
  on public.player_saves
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "player_saves_insert_own"
  on public.player_saves
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "player_saves_update_own"
  on public.player_saves
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "player_saves_delete_own"
  on public.player_saves
  for delete
  to authenticated
  using (auth.uid() = user_id);
