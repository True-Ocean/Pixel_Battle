-- 公開デッキに本人が設定したデッキ名を追加
-- Supabase SQL Editor でこのファイル全体を実行してください。
--
-- 既存行と旧クライアントからの公開を壊さないよう nullable にしています。
-- deck_name が無い行はクライアント側で「公開デッキN」と表示します。

alter table public.public_ghost_decks
  add column if not exists deck_name text;

comment on column public.public_ghost_decks.deck_name is
  '公開時点のデッキ名。NULLまたは空文字はクライアント側の既定名で表示する。';
