create extension if not exists pgcrypto with schema extensions;

create type public.board_visibility as enum (
  'private',
  'link_viewer',
  'link_editor',
  'public_viewer'
);

create type public.board_role as enum ('owner', 'editor', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (
    char_length(trim(display_name)) between 2 and 80
  ),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null default 'Untitled board' check (
    char_length(trim(title)) between 1 and 120
  ),
  visibility public.board_visibility not null default 'private',
  thumbnail_url text,
  share_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.board_role not null,
  joined_at timestamptz not null default now(),
  invited_by uuid references public.profiles(id) on delete set null,
  primary key (board_id, user_id)
);

create table public.board_invitations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.board_role not null check (role <> 'owner'),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint invitation_expiry_after_creation check (expires_at > created_at)
);

create table public.board_recent_access (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_opened_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table public.board_activity (
  id bigint generated always as identity primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.board_snapshots (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  storage_reference text not null,
  created_at timestamptz not null default now(),
  reason text not null check (char_length(reason) between 1 and 120)
);

create table public.asset_records (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_key text not null unique,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index boards_owner_updated_idx
  on public.boards(owner_id, updated_at desc);
create index boards_activity_idx on public.boards(last_activity_at desc);
create index board_members_user_idx
  on public.board_members(user_id, joined_at desc);
create index board_invitations_board_idx
  on public.board_invitations(board_id, created_at desc);
create index board_invitations_email_idx
  on public.board_invitations(email, expires_at)
  where accepted_at is null and revoked_at is null;
create index board_recent_access_user_idx
  on public.board_recent_access(user_id, last_opened_at desc);
create index board_activity_board_idx
  on public.board_activity(board_id, created_at desc);
create index board_snapshots_board_idx
  on public.board_snapshots(board_id, created_at desc);
create index asset_records_board_idx
  on public.asset_records(board_id, created_at desc)
  where deleted_at is null;

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger boards_set_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if char_length(candidate_name) < 2 then
    candidate_name := split_part(new.email, '@', 1);
  end if;
  if char_length(candidate_name) < 2 then
    candidate_name := 'User';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(candidate_name, 80));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_board_created
after insert on public.boards
for each row execute function public.add_owner_membership();

create function public.is_board_owner(
  requested_board_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards
    where id = requested_board_id
      and owner_id = requested_user_id
  );
$$;

create function public.board_role_for(
  requested_board_id uuid,
  requested_user_id uuid default auth.uid()
)
returns public.board_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when b.owner_id = requested_user_id then 'owner'::public.board_role
    else bm.role
  end
  from public.boards b
  left join public.board_members bm
    on bm.board_id = b.id and bm.user_id = requested_user_id
  where b.id = requested_board_id;
$$;

create function public.can_view_board(
  requested_board_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards b
    left join public.board_members bm
      on bm.board_id = b.id and bm.user_id = requested_user_id
    where b.id = requested_board_id
      and (
        b.owner_id = requested_user_id
        or bm.user_id is not null
        or b.visibility = 'public_viewer'
      )
  );
$$;

create function public.shares_board_with(profile_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select profile_user_id = auth.uid() or exists (
    select 1
    from public.board_members mine
    join public.board_members theirs on theirs.board_id = mine.board_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profile_user_id
  );
$$;

revoke all on function public.is_board_owner(uuid, uuid) from public;
revoke all on function public.board_role_for(uuid, uuid) from public;
revoke all on function public.can_view_board(uuid, uuid) from public;
revoke all on function public.shares_board_with(uuid) from public;
grant execute on function public.is_board_owner(uuid, uuid) to authenticated;
grant execute on function public.board_role_for(uuid, uuid) to authenticated;
grant execute on function public.can_view_board(uuid, uuid) to authenticated;
grant execute on function public.shares_board_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_invitations enable row level security;
alter table public.board_recent_access enable row level security;
alter table public.board_activity enable row level security;
alter table public.board_snapshots enable row level security;
alter table public.asset_records enable row level security;

create policy "profiles_select_collaborators"
on public.profiles for select
to authenticated
using (public.shares_board_with(id));

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "boards_select_authorized"
on public.boards for select
to authenticated
using (public.can_view_board(id));

create policy "boards_insert_owner"
on public.boards for insert
to authenticated
with check (owner_id = auth.uid());

create policy "boards_update_owner"
on public.boards for update
to authenticated
using (public.is_board_owner(id))
with check (owner_id = auth.uid());

create policy "boards_delete_owner"
on public.boards for delete
to authenticated
using (public.is_board_owner(id));

create policy "members_select_board"
on public.board_members for select
to authenticated
using (public.can_view_board(board_id));

create policy "members_insert_owner_managed"
on public.board_members for insert
to authenticated
with check (
  public.is_board_owner(board_id)
  and role <> 'owner'
  and user_id <> auth.uid()
);

create policy "members_update_owner_managed"
on public.board_members for update
to authenticated
using (
  public.is_board_owner(board_id)
  and user_id <> auth.uid()
  and role <> 'owner'
)
with check (
  public.is_board_owner(board_id)
  and user_id <> auth.uid()
  and role <> 'owner'
);

create policy "members_delete_owner_managed"
on public.board_members for delete
to authenticated
using (
  public.is_board_owner(board_id)
  and user_id <> auth.uid()
  and role <> 'owner'
);

create policy "invitations_select_owner"
on public.board_invitations for select
to authenticated
using (public.is_board_owner(board_id));

create policy "invitations_insert_owner"
on public.board_invitations for insert
to authenticated
with check (
  public.is_board_owner(board_id)
  and invited_by = auth.uid()
  and role <> 'owner'
);

create policy "invitations_update_owner"
on public.board_invitations for update
to authenticated
using (public.is_board_owner(board_id))
with check (public.is_board_owner(board_id) and role <> 'owner');

create policy "invitations_delete_owner"
on public.board_invitations for delete
to authenticated
using (public.is_board_owner(board_id));

create policy "recent_access_select_self"
on public.board_recent_access for select
to authenticated
using (user_id = auth.uid() and public.can_view_board(board_id));

create policy "recent_access_insert_self"
on public.board_recent_access for insert
to authenticated
with check (user_id = auth.uid() and public.can_view_board(board_id));

create policy "recent_access_update_self"
on public.board_recent_access for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and public.can_view_board(board_id));

create policy "recent_access_delete_self"
on public.board_recent_access for delete
to authenticated
using (user_id = auth.uid());

create policy "activity_select_board"
on public.board_activity for select
to authenticated
using (public.can_view_board(board_id));

create policy "snapshots_select_board"
on public.board_snapshots for select
to authenticated
using (public.can_view_board(board_id));

create policy "snapshots_insert_editor"
on public.board_snapshots for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.board_role_for(board_id) in ('owner', 'editor')
);

create policy "assets_select_board"
on public.asset_records for select
to authenticated
using (public.can_view_board(board_id));

create policy "assets_insert_editor"
on public.asset_records for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.board_role_for(board_id) in ('owner', 'editor')
);

create policy "assets_update_uploader_or_owner"
on public.asset_records for update
to authenticated
using (
  uploaded_by = auth.uid() or public.is_board_owner(board_id)
)
with check (
  uploaded_by = auth.uid() or public.is_board_owner(board_id)
);

create function public.accept_board_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.board_invitations;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select *
  into invitation
  from public.board_invitations
  where token_hash = encode(
    extensions.digest(invitation_token, 'sha256'),
    'hex'
  )
  for update;

  if invitation.id is null then
    raise exception 'invalid_invitation';
  end if;
  if invitation.revoked_at is not null then
    raise exception 'revoked_invitation';
  end if;
  if invitation.accepted_at is not null then
    raise exception 'used_invitation';
  end if;
  if invitation.expires_at <= now() then
    raise exception 'expired_invitation';
  end if;
  if lower(invitation.email) <> current_email then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.board_members (
    board_id,
    user_id,
    role,
    invited_by
  )
  values (
    invitation.board_id,
    auth.uid(),
    invitation.role,
    invitation.invited_by
  )
  on conflict (board_id, user_id) do update
    set role = case
      when public.board_members.role = 'owner'
        then public.board_members.role
      else excluded.role
    end;

  update public.board_invitations
  set accepted_at = now()
  where id = invitation.id;

  return invitation.board_id;
end;
$$;

revoke all on function public.accept_board_invitation(text) from public;
grant execute on function public.accept_board_invitation(text) to authenticated;
