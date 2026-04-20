create or replace function public.get_admin_users()
returns table (
  user_id uuid,
  email text,
  role text,
  note text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1
    from public.admin_users as au
    where au.user_id = current_user_id
      and au.role = 'owner'
  ) then
    raise exception 'Apenas owners podem listar administradores.';
  end if;

  return query
  select
    au.user_id,
    coalesce(u.email::text, 'Sem email') as email,
    au.role::text,
    au.note::text,
    au.created_at
  from public.admin_users as au
  left join auth.users as u on u.id = au.user_id
  order by au.created_at desc, u.email asc nulls last;
end;
$$;

grant execute on function public.get_admin_users() to authenticated;

create or replace function public.upsert_admin_user_by_email(
  target_email text,
  target_role text,
  target_note text default null
)
returns table (
  user_id uuid,
  email text,
  role text,
  note text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  normalized_note text := nullif(trim(coalesce(target_note, '')), '');
  matched_user auth.users%rowtype;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1
    from public.admin_users as au
    where au.user_id = current_user_id
      and au.role = 'owner'
  ) then
    raise exception 'Apenas owners podem cadastrar administradores.';
  end if;

  if normalized_email = '' then
    raise exception 'Informe um email valido.';
  end if;

  if target_role not in ('owner', 'manager', 'viewer') then
    raise exception 'Papel administrativo invalido.';
  end if;

  select *
  into matched_user
  from auth.users as u
  where lower(coalesce(u.email, '')) = normalized_email
  order by u.created_at desc
  limit 1;

  if matched_user.id is null then
    raise exception 'Nenhum usuario encontrado com esse email.';
  end if;

  insert into public.admin_users (user_id, role, note)
  values (matched_user.id, target_role, normalized_note)
  on conflict (user_id) do update
  set role = excluded.role,
      note = excluded.note;

  return query
  select
    au.user_id,
    coalesce(u.email::text, 'Sem email') as email,
    au.role::text,
    au.note::text,
    au.created_at
  from public.admin_users as au
  left join auth.users as u on u.id = au.user_id
  where au.user_id = matched_user.id;
end;
$$;

grant execute on function public.upsert_admin_user_by_email(text, text, text) to authenticated;