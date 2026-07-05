-- オンライン対人戦: 単一正本（battle_state）用メタデータ
alter table public.online_battle_rooms
  add column if not exists battle_revision integer not null default 0,
  add column if not exists battle_phase text not null default 'select'
    check (
      battle_phase in ('select', 'promotion', 'turn_start')
    ),
  add column if not exists last_clash jsonb;

-- 既存バトル中ルームは select フェーズとして扱う
update public.online_battle_rooms
set
  battle_phase = 'select',
  battle_revision = coalesce(battle_revision, 0)
where status = 'battle';
