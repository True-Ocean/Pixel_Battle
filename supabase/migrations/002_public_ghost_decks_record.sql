-- 公開デッキに対人戦（オフライン）の勝敗を載せる
-- SQL Editor で実行してください（001 を実行済みのプロジェクト向け）

alter table public.public_ghost_decks
  add column if not exists offline_pvp_wins integer not null default 0
    check (offline_pvp_wins >= 0);

alter table public.public_ghost_decks
  add column if not exists offline_pvp_losses integer not null default 0
    check (offline_pvp_losses >= 0);
