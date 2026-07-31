-- Fix profile insertion RLS policy and auto-heal missing user profiles

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'profiles' 
      and policyname = 'profiles_insert_self'
  ) then
    create policy profiles_insert_self
    on public.profiles for insert
    to authenticated
    with check (id = auth.uid());
  end if;
end
$$;

-- Self-heal any existing auth users missing from public.profiles
insert into public.profiles (id, display_name)
select 
  id, 
  coalesce(
    nullif(raw_user_meta_data ->> 'display_name', ''),
    nullif(raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(email, ''), '@', 1),
    'User'
  )
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- Ensure boards_insert_owner policy is properly configured for authenticated users
drop policy if exists boards_insert_owner on public.boards;

create policy boards_insert_owner
on public.boards for insert
to authenticated
with check (owner_id = auth.uid());
