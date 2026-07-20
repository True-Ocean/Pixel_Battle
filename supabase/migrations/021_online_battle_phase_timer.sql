-- フレンド対戦バトル中の持ち時間（select / promotion）
-- 005〜020 実行済みのプロジェクトで SQL Editor から実行してください。

alter table public.online_battle_rooms
  add column if not exists host_phase_timer_ready boolean not null default false,
  add column if not exists guest_phase_timer_ready boolean not null default false,
  add column if not exists phase_timer_started_at timestamptz;
