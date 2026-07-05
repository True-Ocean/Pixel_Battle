-- 終了済み・期限切れ waiting ルームの自動削除
-- pg_cron: Dashboard → Database → Extensions で pg_cron を有効化してから実行

create or replace function public.cleanup_stale_online_battle_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.online_battle_rooms
  where
    (
      status = 'closed'
      and updated_at < now() - interval '1 hour'
    )
    or (
      status = 'waiting'
      and guest_user_id is null
      and expires_at < now()
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.cleanup_stale_online_battle_rooms() is
  'status=closed かつ updated_at が1時間超過、または未参加で期限切れの waiting を削除';

revoke all on function public.cleanup_stale_online_battle_rooms() from public;
grant execute on function public.cleanup_stale_online_battle_rooms() to authenticated;
grant execute on function public.cleanup_stale_online_battle_rooms() to service_role;

create extension if not exists pg_cron with schema extensions;

do $schedule$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'cleanup-stale-online-battle-rooms'
  ) then
    perform cron.unschedule(j.jobid)
    from cron.job j
    where j.jobname = 'cleanup-stale-online-battle-rooms';
  end if;

  perform cron.schedule(
    'cleanup-stale-online-battle-rooms',
    '15 * * * *',
    $cmd$select public.cleanup_stale_online_battle_rooms();$cmd$
  );
exception
  when undefined_table then
    raise notice 'pg_cron unavailable; enable extension and re-run, or rely on client RPC cleanup';
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$schedule$;
