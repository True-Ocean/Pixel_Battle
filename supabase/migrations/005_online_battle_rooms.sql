-- 対人戦（オンライン）プライベートルーム
-- 001〜004 実行済みのプロジェクトで SQL Editor から実行してください。
-- Realtime: Database → Publications → supabase_realtime に本テーブルを追加

create table if not exists public.online_battle_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  guest_user_id uuid references auth.users (id) on delete set null,
  host_name text not null,
  guest_name text,
  host_level integer not null check (host_level >= 1),
  guest_level integer check (guest_level is null or guest_level >= 1),
  status text not null default 'waiting'
    check (
      status in (
        'waiting',
        'deck_select',
        'setup',
        'battle',
        'rematch_wait',
        'closed'
      )
    ),
  host_balance integer not null default 1000 check (host_balance >= 0),
  guest_balance integer check (guest_balance is null or guest_balance >= 0),
  host_deck jsonb,
  guest_deck jsonb,
  host_formation jsonb,
  guest_formation jsonb,
  host_setup_ready boolean not null default false,
  guest_setup_ready boolean not null default false,
  battle_state jsonb,
  host_pending_action jsonb,
  guest_pending_action jsonb,
  host_rematch_ready boolean not null default false,
  guest_rematch_ready boolean not null default false,
  host_deck_change boolean not null default false,
  guest_deck_change boolean not null default false,
  disconnect_user_id uuid,
  disconnect_deadline timestamptz,
  last_transfer_px integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists online_battle_rooms_code_idx
  on public.online_battle_rooms (code);

create index if not exists online_battle_rooms_host_user_id_idx
  on public.online_battle_rooms (host_user_id);

create index if not exists online_battle_rooms_expires_at_idx
  on public.online_battle_rooms (expires_at);

alter table public.online_battle_rooms enable row level security;

drop policy if exists "online_battle_rooms_select" on public.online_battle_rooms;
create policy "online_battle_rooms_select"
  on public.online_battle_rooms
  for select
  to authenticated
  using (
    auth.uid() = host_user_id
    or auth.uid() = guest_user_id
    or (
      status = 'waiting'
      and guest_user_id is null
      and expires_at > now()
    )
  );

drop policy if exists "online_battle_rooms_insert" on public.online_battle_rooms;
create policy "online_battle_rooms_insert"
  on public.online_battle_rooms
  for insert
  to authenticated
  with check (auth.uid() = host_user_id);

drop policy if exists "online_battle_rooms_update" on public.online_battle_rooms;
create policy "online_battle_rooms_update"
  on public.online_battle_rooms
  for update
  to authenticated
  using (
    auth.uid() = host_user_id
    or auth.uid() = guest_user_id
  )
  with check (
    auth.uid() = host_user_id
    or auth.uid() = guest_user_id
  );

drop policy if exists "online_battle_rooms_guest_join" on public.online_battle_rooms;
create policy "online_battle_rooms_guest_join"
  on public.online_battle_rooms
  for update
  to authenticated
  using (
    status = 'waiting'
    and guest_user_id is null
    and expires_at > now()
  )
  with check (
    auth.uid() = guest_user_id
    and status = 'deck_select'
  );

drop policy if exists "online_battle_rooms_delete" on public.online_battle_rooms;
create policy "online_battle_rooms_delete"
  on public.online_battle_rooms
  for delete
  to authenticated
  using (auth.uid() = host_user_id);

grant select, insert, update, delete on table public.online_battle_rooms to authenticated;
