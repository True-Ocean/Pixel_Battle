-- オンライン PvP: Realtime 部分 UPDATE 対策（migration 015）
-- Supabase Dashboard → SQL Editor で実行
--
-- これがないと guest_pending_action だけ更新したとき payload に battle_state が含まれず、
-- クライアントが TURN1 表示・操作不能になることがある。

ALTER TABLE online_battle_rooms REPLICA IDENTITY FULL;

-- 確認
SELECT c.relname, c.relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'online_battle_rooms';
-- relreplident = 'f' (FULL) なら OK
