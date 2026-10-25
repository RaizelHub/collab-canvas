-- Pages uses a separate permission boundary from Whiteboard.
create table public.manuscripts (
 id uuid primary key, owner_id uuid not null references public.profiles(id),
 title text not null check(char_length(title) between 1 and 120), template text not null,
 initial_state text not null check(octet_length(initial_state)<=16777216),
 created_at timestamptz not null default now()
);
create table public.manuscript_members (
 document_id uuid references public.manuscripts(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 role text not null check(role in ('editor','commenter','viewer')),
 primary key(document_id,user_id)
);
create function public.manuscript_role(doc_id uuid) returns text language sql stable security definer set search_path='' as $$
 select case when m.owner_id=auth.uid() then 'owner' else mm.role end
 from public.manuscripts m left join public.manuscript_members mm on mm.document_id=m.id and mm.user_id=auth.uid() where m.id=doc_id;
$$;
revoke all on function public.manuscript_role(uuid) from public;
grant execute on function public.manuscript_role(uuid) to authenticated;
create table public.manuscript_updates (
 sequence bigint generated always as identity unique,
 id uuid primary key, document_id uuid not null references public.manuscripts(id) on delete cascade,
 author_id uuid not null references public.profiles(id),
 "update" text not null check(octet_length("update")<=16777216), created_at timestamptz not null default now()
);
create index manuscript_updates_document_idx on public.manuscript_updates(document_id,sequence);
create table public.manuscript_comments (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.manuscripts(id) on delete cascade,
 author_id uuid not null references public.profiles(id), quote text not null default '' check(char_length(quote)<=2000),
 body text not null check(char_length(body) between 1 and 4000), resolved boolean not null default false, created_at timestamptz not null default now()
);
create table public.manuscript_revisions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.manuscripts(id) on delete cascade,
 author_id uuid not null references public.profiles(id), snapshot jsonb not null check(octet_length(snapshot::text)<=16777216), created_at timestamptz not null default now()
);
alter table public.manuscripts enable row level security;
alter table public.manuscript_members enable row level security;
alter table public.manuscript_updates enable row level security;
alter table public.manuscript_comments enable row level security;
alter table public.manuscript_revisions enable row level security;
create policy manuscripts_read on public.manuscripts for select to authenticated using(public.manuscript_role(id) is not null);
create policy manuscripts_create on public.manuscripts for insert to authenticated with check(owner_id=auth.uid());
create policy manuscripts_rename on public.manuscripts for update to authenticated using(public.manuscript_role(id) in ('owner','editor')) with check(public.manuscript_role(id) in ('owner','editor'));
create policy manuscript_members_read on public.manuscript_members for select to authenticated using(public.manuscript_role(document_id) is not null);
create policy manuscript_members_remove on public.manuscript_members for delete to authenticated using(public.manuscript_role(document_id)='owner');
create policy manuscript_updates_read on public.manuscript_updates for select to authenticated using(public.manuscript_role(document_id) is not null);
create policy manuscript_updates_append on public.manuscript_updates for insert to authenticated with check(author_id=auth.uid() and public.manuscript_role(document_id) in ('owner','editor'));
create policy manuscript_comments_read on public.manuscript_comments for select to authenticated using(public.manuscript_role(document_id) is not null);
create policy manuscript_comments_create on public.manuscript_comments for insert to authenticated with check(author_id=auth.uid() and public.manuscript_role(document_id) in ('owner','editor','commenter'));
create policy manuscript_comments_resolve on public.manuscript_comments for update to authenticated using(public.manuscript_role(document_id) in ('owner','editor') or (author_id=auth.uid() and public.manuscript_role(document_id)='commenter')) with check(public.manuscript_role(document_id) is not null);
create policy manuscript_revisions_read on public.manuscript_revisions for select to authenticated using(public.manuscript_role(document_id) is not null);
create policy manuscript_revisions_append on public.manuscript_revisions for insert to authenticated with check(author_id=auth.uid() and public.manuscript_role(document_id) in ('owner','editor'));
revoke all on public.manuscripts,public.manuscript_members,public.manuscript_updates,public.manuscript_comments,public.manuscript_revisions from anon,authenticated;
grant select,insert on public.manuscripts to authenticated;
grant update(title) on public.manuscripts to authenticated;
grant select,delete on public.manuscript_members to authenticated;
grant select,insert on public.manuscript_updates to authenticated;
grant usage on sequence public.manuscript_updates_sequence_seq to authenticated;
grant select,insert on public.manuscript_comments to authenticated;
grant update(resolved) on public.manuscript_comments to authenticated;
grant select,insert on public.manuscript_revisions to authenticated;
create function public.add_manuscript_member(doc_id uuid, member_email text, member_role text) returns void language plpgsql security definer set search_path='' as $$
declare target_user uuid;
begin
 if public.manuscript_role(doc_id) is distinct from 'owner' then raise exception 'Only the owner may change access'; end if;
 if member_role not in ('editor','commenter','viewer') then raise exception 'Invalid role'; end if;
 select id into target_user from auth.users where lower(email)=lower(trim(member_email));
 if target_user is null then raise exception 'No registered account with that email'; end if;
 if target_user=auth.uid() then raise exception 'Owner access cannot be changed'; end if;
 insert into public.manuscript_members(document_id,user_id,role) values(doc_id,target_user,member_role) on conflict(document_id,user_id) do update set role=excluded.role;
end; $$;
revoke all on function public.add_manuscript_member(uuid,text,text) from public;
grant execute on function public.add_manuscript_member(uuid,text,text) to authenticated;


