-- Realtime UPDATE で jsonb 列が省略されないようにする。
-- default (CHANGED) だと guest_pending_action だけ更新したとき payload に
-- battle_state が含まれず、クライアントが盤面を null 扱いにしてしまう。
ALTER TABLE online_battle_rooms REPLICA IDENTITY FULL;
