-- Exercise the real signup trigger in an isolated transaction. No message is sent.
begin;
do $test$
declare
  test_user uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (test_user, test_user::text || '@orbit-demo.example.invalid', '{"role":"admin","display_name":"  "}');
  if not exists(select 1 from public.user_roles where user_id=test_user and role='customer')
    then raise exception 'Client metadata assigned a privileged role'; end if;
  if not exists(select 1 from public.user_profiles where user_id=test_user and display_name='Customer')
    then raise exception 'Missing-name bootstrap failed'; end if;
end $test$;
rollback;

