-- オンライン PvP スキーマ確認（SQL Editor で単独実行）
-- 005〜009 未適用の場合は online_battle_rooms 自体が存在しません。

-- 1) 必須カラム（005〜014）
select
  expected.column_name,
  case when c.column_name is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('setup_started_at'),       -- 009
    ('closed_by_role'),         -- 010
    ('battle_revision'),        -- 011
    ('battle_phase'),           -- 011
    ('last_clash'),             -- 011
    ('power_balance_applied')   -- 014
) as expected(column_name)
left join information_schema.columns c
  on c.table_schema = 'public'
  and c.table_name = 'online_battle_rooms'
  and c.column_name = expected.column_name
order by expected.column_name;

-- 2) RPC 関数
select
  expected.proname,
  case when p.proname is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('join_online_battle_room'),
    ('cleanup_stale_online_battle_rooms')
) as expected(proname)
left join pg_proc p on p.proname = expected.proname
left join pg_namespace n on p.pronamespace = n.oid and n.nspname = 'public'
order by expected.proname;

-- 3) Realtime publication（手動設定の確認）
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename = 'online_battle_rooms';
