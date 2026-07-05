-- オンライン対戦: 参加 RPC + RLS 再設定（006/007 未適用・古い 005 でも実行可）
-- SQL Editor でこのファイルを丸ごと Run してください。

-- 1) 待機中ルームをコード検索できる SELECT ポリシー
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

-- 2) コード参加 RPC（RLS バイパス）
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
    guest_balance = 1000,
    status = 'deck_select',
    updated_at = now()
  where id = v_room.id
  returning * into v_room;

  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room));
end;
$$;

revoke all on function public.join_online_battle_room(text, text, integer) from public;
grant execute on function public.join_online_battle_room(text, text, integer) to authenticated;

-- PostgREST のスキーマキャッシュ更新
notify pgrst, 'reload schema';
