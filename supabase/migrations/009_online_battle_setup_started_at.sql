-- バトル準備（配置）フェーズの同期用タイムスタンプ
-- 005〜008 実行済みのプロジェクトで SQL Editor から実行してください。

alter table public.online_battle_rooms
  add column if not exists setup_started_at timestamptz;
