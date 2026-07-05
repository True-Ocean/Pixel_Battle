-- ルームコード参加（RLS をバイパスする SECURITY DEFINER RPC）
-- 006 実行済みでも参加できない場合に SQL Editor から実行してください。

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

notify pgrst, 'reload schema';
