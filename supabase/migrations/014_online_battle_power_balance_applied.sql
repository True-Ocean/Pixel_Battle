-- バトル開始時の戦力補正適用フラグ（バナー「補正後」表示用）
ALTER TABLE online_battle_rooms
  ADD COLUMN IF NOT EXISTS power_balance_applied boolean NOT NULL DEFAULT false;
