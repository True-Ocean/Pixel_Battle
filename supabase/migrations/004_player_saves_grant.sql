-- 003 を GRANT 無しで実行済みのプロジェクト向け修正
-- permission denied for table player_saves が出る場合に SQL Editor で実行

grant select, insert, update, delete on table public.player_saves to authenticated;
