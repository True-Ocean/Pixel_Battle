-- Phase G: 公開ゴーストデッキ
-- Supabase SQL Editor でこのファイル全体を実行してください。
-- あわせて Authentication → Providers → Anonymous を有効化してください。

create table if not exists public.public_ghost_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slot_index integer not null check (slot_index >= 0 and slot_index < 5),
  author_name text not null,
  author_level integer not null check (author_level >= 1),
  offline_pvp_wins integer not null default 0 check (offline_pvp_wins >= 0),
  offline_pvp_losses integer not null default 0 check (offline_pvp_losses >= 0),
  deck jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slot_index)
);

create index if not exists public_ghost_decks_author_level_idx
  on public.public_ghost_decks (author_level);

create index if not exists public_ghost_decks_owner_id_idx
  on public.public_ghost_decks (owner_id);

alter table public.public_ghost_decks enable row level security;

drop policy if exists "public_ghost_decks_select" on public.public_ghost_decks;
create policy "public_ghost_decks_select"
  on public.public_ghost_decks
  for select
  to authenticated
  using (true);

drop policy if exists "public_ghost_decks_insert" on public.public_ghost_decks;
create policy "public_ghost_decks_insert"
  on public.public_ghost_decks
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "public_ghost_decks_update" on public.public_ghost_decks;
create policy "public_ghost_decks_update"
  on public.public_ghost_decks
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "public_ghost_decks_delete" on public.public_ghost_decks;
create policy "public_ghost_decks_delete"
  on public.public_ghost_decks
  for delete
  to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on table public.public_ghost_decks to authenticated;
