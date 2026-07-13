-- オンライン PvP v2: migration 010〜014 を順に適用
-- 前提: 005_online_battle_rooms.sql 〜 009_online_battle_setup_started_at.sql が適用済み
--
-- Supabase Dashboard → SQL Editor → New query → 本ファイル全文を貼り付け → Run
--
-- 012 の pg_cron スケジュールは無料プラン等で失敗しても問題ありません（NOTICE のみ）。
-- 013 実行後は join RPC と cleanup 関数が更新されます。
-- 適用後、末尾の「適用確認」SELECT の結果を確認してください。

-- ========== 010: closed_by_role ==========
alter table public.online_battle_rooms
  add column if not exists closed_by_role text
  check (closed_by_role is null or closed_by_role in ('host', 'guest'));

-- ========== 011: battle_revision / battle_phase / last_clash ==========
alter table public.online_battle_rooms
  add column if not exists battle_revision integer not null default 0,
  add column if not exists battle_phase text not null default 'select'
    check (
      battle_phase in ('select', 'promotion', 'turn_start')
    ),
  add column if not exists last_clash jsonb;

update public.online_battle_rooms
set
  battle_phase = 'select',
  battle_revision = coalesce(battle_revision, 0)
where status = 'battle';

-- ========== 012: cleanup_stale_online_battle_rooms + pg_cron（任意） ==========
create or replace function public.cleanup_stale_online_battle_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.online_battle_rooms
  where
    (
      status = 'closed'
      and updated_at < now() - interval '1 hour'
    )
    or (
      status = 'waiting'
      and guest_user_id is null
      and expires_at < now()
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.cleanup_stale_online_battle_rooms() is
  'status=closed かつ updated_at が1時間超過、または未参加で期限切れの waiting を削除';

revoke all on function public.cleanup_stale_online_battle_rooms() from public;
grant execute on function public.cleanup_stale_online_battle_rooms() to authenticated;
grant execute on function public.cleanup_stale_online_battle_rooms() to service_role;

create extension if not exists pg_cron with schema extensions;

do $schedule$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'cleanup-stale-online-battle-rooms'
  ) then
    perform cron.unschedule(j.jobid)
    from cron.job j
    where j.jobname = 'cleanup-stale-online-battle-rooms';
  end if;

  perform cron.schedule(
    'cleanup-stale-online-battle-rooms',
    '15 * * * *',
    $cmd$select public.cleanup_stale_online_battle_rooms();$cmd$
  );
exception
  when undefined_table then
    raise notice 'pg_cron unavailable; enable extension and re-run, or rely on client RPC cleanup';
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$schedule$;

-- ========== 013: join RPC（guest_balance=0）+ cleanup 更新 ==========
create or replace function public.join_online_battle_room(
  p_code text,
  p_guest_name text,
  p_guest_level integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.online_battle_rooms%rowtype;
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_failed');
  end if;

  v_code := lpad(
    regexp_replace(trim(coalesce(p_code, '')), '\D', '', 'g'),
    6,
    '0'
  );
  if length(v_code) <> 6 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select *
  into v_room
  from public.online_battle_rooms
  where code = v_code
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'room_not_found');
  end if;

  if v_room.status = 'closed' then
    return jsonb_build_object('ok', false, 'error', 'room_closed');
  end if;

  if v_room.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'room_expired');
  end if;

  if v_room.host_user_id = v_uid then
    return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
  end if;

  if v_room.guest_user_id is not null and v_room.guest_user_id = v_uid then
    return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
  end if;

  if v_room.guest_user_id is not null and v_room.guest_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'room_full');
  end if;

  if v_room.status <> 'waiting' then
    return jsonb_build_object('ok', false, 'error', 'room_not_joinable');
  end if;

  update public.online_battle_rooms
  set
    guest_user_id = v_uid,
    guest_name = p_guest_name,
    guest_level = greatest(1, coalesce(p_guest_level, 1)),
    guest_balance = 0,
    status = 'deck_select',
    updated_at = now()
  where id = v_room.id
  returning * into v_room;

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

revoke all on function public.join_online_battle_room(text, text, integer) from public;
grant execute on function public.join_online_battle_room(text, text, integer) to authenticated;

create or replace function public.cleanup_stale_online_battle_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.online_battle_rooms
  where updated_at < now() - interval '1 hour';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.cleanup_stale_online_battle_rooms() is
  'updated_at が1時間超過した online_battle_rooms 行を削除（status 問わず）';

revoke all on function public.cleanup_stale_online_battle_rooms() from public;
grant execute on function public.cleanup_stale_online_battle_rooms() to authenticated;
grant execute on function public.cleanup_stale_online_battle_rooms() to service_role;

-- ========== 014: power_balance_applied ==========
alter table public.online_battle_rooms
  add column if not exists power_balance_applied boolean not null default false;

notify pgrst, 'reload schema';

-- ========== 適用確認（Run 後に Results を確認） ==========
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'online_battle_rooms'
  and column_name in (
    'closed_by_role',
    'battle_revision',
    'battle_phase',
    'last_clash',
    'power_balance_applied',
    'setup_started_at'
  )
order by column_name;

select proname as function_name
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public'
  and proname in ('join_online_battle_room', 'cleanup_stale_online_battle_rooms');
