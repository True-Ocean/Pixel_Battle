-- ルーム退出理由（相手への通知用）
alter table public.online_battle_rooms
  add column if not exists closed_by_role text
  check (closed_by_role is null or closed_by_role in ('host', 'guest'));
