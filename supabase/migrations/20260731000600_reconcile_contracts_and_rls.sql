-- Reconcile the legacy upgrade with the application/Worker contract and
-- replace permissive policies with the Phase 1 authorization model.

begin;

do $$
begin
  if exists (
    select 1
    from pg_type type_record
    join pg_namespace namespace_record
      on namespace_record.oid = type_record.typnamespace
    where namespace_record.nspname = 'public'
      and type_record.typname = 'board_visibility'
      and type_record.typtype = 'e'
  ) then
    alter type public.board_visibility add value if not exists 'private';
    alter type public.board_visibility add value if not exists 'link_viewer';
    alter type public.board_visibility add value if not exists 'link_editor';
    alter type public.board_visibility add value if not exists 'public_viewer';
  end if;
end
$$;

-- PostgreSQL does not allow a newly-added enum label to be referenced until
-- the transaction that added it has committed.
commit;

begin;

-- Preserve intent where an older migration introduced incompatible labels.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'boards'
      and column_name = 'visibility'
  ) then
    execute $sql$
      update public.boards
      set visibility = case visibility::text
        when 'public_readonly' then 'public_viewer'::public.board_visibility
        else 'private'::public.board_visibility
      end
      where visibility::text in (
        'organization',
        'public_readonly',
        'public_editable'
      )
    $sql$;
  end if;
end
$$;

alter table public.boards
  drop constraint if exists boards_visibility_supported_check;
alter table public.boards
  add constraint boards_visibility_supported_check check (
    visibility::text in (
      'private',
      'link_viewer',
      'link_editor',
      'public_viewer'
    )
  );

-- Reconcile snapshot fields while retaining rows made by the legacy schema.
alter table public.board_snapshots
  add column if not exists storage_reference text,
  add column if not exists reason text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'board_snapshots'
      and column_name = 'object_key'
  ) then
    execute $sql$
      update public.board_snapshots
      set storage_reference = object_key
      where storage_reference is null
    $sql$;
  end if;
end
$$;

update public.board_snapshots
set reason = 'Legacy snapshot'
where reason is null or trim(reason) = '';

alter table public.board_snapshots
  alter column storage_reference set not null,
  alter column reason set not null,
  drop column if exists object_key,
  drop column if exists sequence_number,
  drop column if exists byte_size;

alter table public.board_snapshots
  drop constraint if exists board_snapshots_reason_check;
alter table public.board_snapshots
  add constraint board_snapshots_reason_check check (
    char_length(reason) between 1 and 120
  );

drop index if exists public.board_snapshots_board_sequence_idx;
create index if not exists board_snapshots_board_idx
  on public.board_snapshots(board_id, created_at desc);

-- Reconcile asset fields while retaining legacy metadata.
alter table public.asset_records
  add column if not exists storage_key text,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists deleted_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'asset_records'
      and column_name = 'object_key'
  ) then
    execute $sql$
      update public.asset_records
      set storage_key = object_key
      where storage_key is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'asset_records'
      and column_name = 'file_name'
  ) then
    execute $sql$
      update public.asset_records
      set original_filename = file_name
      where original_filename is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'asset_records'
      and column_name = 'content_type'
  ) then
    execute $sql$
      update public.asset_records
      set mime_type = content_type
      where mime_type is null
    $sql$;
  end if;
end
$$;

update public.asset_records asset
set uploaded_by = board.owner_id
from public.boards board
where board.id = asset.board_id
  and asset.uploaded_by is null;

update public.asset_records
set original_filename = 'legacy-upload'
where original_filename is null or trim(original_filename) = '';

update public.asset_records
set mime_type = 'application/octet-stream'
where mime_type is null or trim(mime_type) = '';

alter table public.asset_records
  alter column storage_key set not null,
  alter column original_filename set not null,
  alter column mime_type set not null,
  alter column uploaded_by set not null,
  drop column if exists object_key,
  drop column if exists file_name,
  drop column if exists content_type;

create unique index if not exists asset_records_storage_key_key
  on public.asset_records(storage_key);

alter table public.asset_records
  drop constraint if exists asset_records_byte_size_check,
  drop constraint if exists asset_records_width_check,
  drop constraint if exists asset_records_height_check;
alter table public.asset_records
  add constraint asset_records_byte_size_check check (
    byte_size > 0 and byte_size <= 20971520
  ) not valid,
  add constraint asset_records_width_check check (
    width is null or width > 0
  ),
  add constraint asset_records_height_check check (
    height is null or height > 0
  );

create index if not exists asset_records_board_idx
  on public.asset_records(board_id, created_at desc)
  where deleted_at is null;

alter table public.board_invitations
  drop constraint if exists board_invitations_role_check;
alter table public.board_invitations
  add constraint board_invitations_role_check check (
    role::text in ('editor', 'viewer')
  ) not valid;

-- Owner identity always comes from boards.owner_id. Membership rows cannot
-- manufacture an owner for Worker authorization.
create or replace function public.board_role_for(
  target_board_id uuid,
  target_user_id uuid default auth.uid()
)
returns public.board_role
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when board.owner_id = target_user_id
      then 'owner'::public.board_role
    else member.role::text::public.board_role
  end
  from public.boards board
  left join public.board_members member
    on member.board_id = board.id
    and member.user_id = target_user_id
  where board.id = target_board_id;
$$;

create or replace function public.can_view_board(
  target_board_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards board
    left join public.board_members member
      on member.board_id = board.id
      and member.user_id = target_user_id
    where board.id = target_board_id
      and (
        board.owner_id = target_user_id
        or member.user_id is not null
        or board.visibility::text = 'public_viewer'
      )
  );
$$;

drop policy if exists boards_select_accessible on public.boards;
drop policy if exists boards_insert_owner on public.boards;
drop policy if exists boards_update_owner_or_editor on public.boards;
drop policy if exists boards_update_owner on public.boards;
drop policy if exists boards_delete_owner on public.boards;

create policy boards_select_accessible
on public.boards for select
to authenticated
using (public.can_view_board(id));

create policy boards_insert_owner
on public.boards for insert
to authenticated
with check (owner_id = auth.uid());

create policy boards_update_owner
on public.boards for update
to authenticated
using (public.is_board_owner(id))
with check (owner_id = auth.uid());

create policy boards_delete_owner
on public.boards for delete
to authenticated
using (public.is_board_owner(id));

drop policy if exists board_members_select_accessible on public.board_members;
drop policy if exists board_members_insert_owner on public.board_members;
drop policy if exists board_members_update_owner on public.board_members;
drop policy if exists board_members_delete_owner_or_self on public.board_members;

create policy board_members_select_accessible
on public.board_members for select
to authenticated
using (public.can_view_board(board_id));

create policy board_members_insert_owner
on public.board_members for insert
to authenticated
with check (
  public.is_board_owner(board_id)
  and role::text in ('editor', 'viewer')
  and user_id <> auth.uid()
);

create policy board_members_update_owner
on public.board_members for update
to authenticated
using (public.is_board_owner(board_id))
with check (
  public.is_board_owner(board_id)
  and role::text in ('editor', 'viewer')
  and user_id <> auth.uid()
);

create policy board_members_delete_owner_or_self
on public.board_members for delete
to authenticated
using (
  public.is_board_owner(board_id)
  or (user_id = auth.uid() and role::text <> 'owner')
);

revoke all on function public.board_role_for(uuid, uuid) from public;
revoke all on function public.can_view_board(uuid, uuid) from public;
grant execute on function public.board_role_for(uuid, uuid) to authenticated;
grant execute on function public.can_view_board(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
