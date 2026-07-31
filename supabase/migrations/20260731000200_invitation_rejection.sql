create function public.reject_board_invitation(invitation_token text)
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
  if invitation.accepted_at is not null then
    raise exception 'used_invitation';
  end if;
  if invitation.revoked_at is not null then
    raise exception 'revoked_invitation';
  end if;
  if invitation.expires_at <= now() then
    raise exception 'expired_invitation';
  end if;
  if lower(invitation.email) <> current_email then
    raise exception 'invitation_email_mismatch';
  end if;

  update public.board_invitations
  set revoked_at = now()
  where id = invitation.id;

  return invitation.board_id;
end;
$$;

revoke all on function public.reject_board_invitation(text) from public;
grant execute on function public.reject_board_invitation(text) to authenticated;
