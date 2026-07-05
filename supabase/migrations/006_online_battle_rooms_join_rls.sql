-- ゲストがコードでルームを検索・参加できるよう RLS を修正
-- 005 実行済みのプロジェクトで SQL Editor から実行してください。

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
