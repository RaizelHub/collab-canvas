-- Create boards through an authenticated, identity-bound RPC.
-- The owner is always derived from the request JWT and cannot be impersonated.

create or replace function public.create_board(
  board_title text default 'Untitled board'
)
returns setof public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
  normalized_title text;
begin
  if requesting_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  normalized_title := coalesce(
    nullif(left(trim(board_title), 120), ''),
    'Untitled board'
  );

  -- Repair profiles for accounts created before the profile trigger existed.
  insert into public.profiles (id, display_name, avatar_url)
  select
    account.id,
    coalesce(
      nullif(account.raw_user_meta_data ->> 'display_name', ''),
      nullif(account.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(account.email, ''), '@', 1),
      'User'
    ),
    nullif(account.raw_user_meta_data ->> 'avatar_url', '')
  from auth.users account
  where account.id = requesting_user_id
  on conflict (id) do nothing;

  return query
  insert into public.boards (owner_id, title)
  values (requesting_user_id, normalized_title)
  returning *;
end;
$$;

revoke all on function public.create_board(text) from public;
revoke all on function public.create_board(text) from anon;
grant execute on function public.create_board(text) to authenticated;

notify pgrst, 'reload schema';
