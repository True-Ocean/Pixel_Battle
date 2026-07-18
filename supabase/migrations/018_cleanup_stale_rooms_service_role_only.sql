-- 古いルーム掃除は pg_cron / service_role のみ（クライアント RPC は廃止）
revoke all on function public.cleanup_stale_online_battle_rooms()
  from public, anon, authenticated;
grant execute on function public.cleanup_stale_online_battle_rooms()
  to service_role;
