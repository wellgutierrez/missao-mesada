create or replace function public.get_admin_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select exists (
    select 1
    from public.admin_users
    where user_id = current_user_id
  ) into is_admin;

  if not is_admin then
    raise exception 'Acesso negado ao painel administrativo.';
  end if;

  return jsonb_build_object(
    'totals', jsonb_build_object(
      'registered_users', (select count(*)::int from auth.users),
      'admin_users', (select count(*)::int from public.admin_users),
      'responsible_profiles', (select count(*)::int from public.profiles),
      'children', (select count(*)::int from public.children),
      'tasks', (select count(*)::int from public.tasks),
      'active_tasks', (select count(*)::int from public.tasks where coalesce(is_active, true)),
      'open_periods', (select count(*)::int from public.allowance_periods where status = 'open'),
      'closed_periods', (select count(*)::int from public.allowance_periods where status = 'closed'),
      'period_summaries', (select count(*)::int from public.period_summaries),
      'task_logs', (select count(*)::int from public.task_logs),
      'task_log_events', (select count(*)::int from public.task_log_events)
    ),
    'activation_funnel', jsonb_build_object(
      'registered_users', (select count(*)::int from auth.users),
      'users_with_children', (
        select count(distinct c.owner_user_id)::int
        from public.children as c
        where c.owner_user_id is not null
      ),
      'children_with_tasks', (
        select count(distinct t.child_id)::int
        from public.tasks as t
        where t.child_id is not null
      ),
      'periods_with_task_logs', (
        select count(distinct tl.period_id)::int
        from public.task_logs as tl
        where tl.period_id is not null
      )
    ),
    'recent_activity', jsonb_build_object(
      'task_logs', jsonb_build_object(
        'last_7_days', (
          select count(*)::int
          from public.task_logs as tl
          where tl.created_at >= timezone('utc', now()) - interval '7 days'
        ),
        'last_30_days', (
          select count(*)::int
          from public.task_logs as tl
          where tl.created_at >= timezone('utc', now()) - interval '30 days'
        )
      ),
      'active_users', jsonb_build_object(
        'last_7_days', (
          select count(distinct tl.owner_user_id)::int
          from public.task_logs as tl
          where tl.owner_user_id is not null
            and tl.created_at >= timezone('utc', now()) - interval '7 days'
        ),
        'last_30_days', (
          select count(distinct tl.owner_user_id)::int
          from public.task_logs as tl
          where tl.owner_user_id is not null
            and tl.created_at >= timezone('utc', now()) - interval '30 days'
        )
      ),
      'closed_periods', jsonb_build_object(
        'last_7_days', (
          select count(*)::int
          from public.allowance_periods as ap
          where ap.status = 'closed'
            and coalesce(ap.closed_at, ap.created_at) >= timezone('utc', now()) - interval '7 days'
        ),
        'last_30_days', (
          select count(*)::int
          from public.allowance_periods as ap
          where ap.status = 'closed'
            and coalesce(ap.closed_at, ap.created_at) >= timezone('utc', now()) - interval '30 days'
        )
      )
    ),
    'alerts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', alerts.alert_id,
          'count', alerts.alert_count
        )
        order by alerts.sort_order
      )
      from (
        select 1 as sort_order, 'users_without_children'::text as alert_id, (
          select count(*)::int
          from auth.users as u
          where not exists (
            select 1
            from public.children as c
            where c.owner_user_id = u.id
          )
        ) as alert_count

        union all

        select 2 as sort_order, 'children_without_tasks'::text as alert_id, (
          select count(*)::int
          from public.children as c
          where not exists (
            select 1
            from public.tasks as t
            where t.child_id = c.id
          )
        ) as alert_count

        union all

        select 3 as sort_order, 'periods_without_task_logs'::text as alert_id, (
          select count(*)::int
          from public.allowance_periods as ap
          where not exists (
            select 1
            from public.task_logs as tl
            where tl.period_id = ap.id
          )
        ) as alert_count
      ) as alerts
      where alerts.alert_count > 0
    ), '[]'::jsonb),
    'recent_signups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', recent_users.id,
        'email', coalesce(recent_users.email, 'Sem email'),
        'created_at', recent_users.created_at
      ))
      from (
        select id, email, created_at
        from auth.users
        order by created_at desc
        limit 8
      ) as recent_users
    ), '[]'::jsonb),
    'recent_children', coalesce((
      select jsonb_agg(jsonb_build_object(
        'child_id', recent_children.id,
        'name', recent_children.name,
        'age', recent_children.age,
        'owner_name', recent_children.owner_name,
        'created_at', recent_children.created_at
      ))
      from (
        select
          c.id,
          c.name,
          c.age,
          c.created_at,
          coalesce(p.full_name, u.email, 'Responsavel sem nome') as owner_name
        from public.children as c
        left join public.profiles as p on p.id = c.owner_user_id
        left join auth.users as u on u.id = c.owner_user_id
        order by c.created_at desc nulls last
        limit 8
      ) as recent_children
    ), '[]'::jsonb),
    'top_families', coalesce((
      select jsonb_agg(jsonb_build_object(
        'owner_user_id', families.owner_user_id,
        'owner_name', families.owner_name,
        'children_count', families.children_count,
        'tasks_count', families.tasks_count,
        'open_periods_count', families.open_periods_count
      ))
      from (
        select
          c.owner_user_id,
          coalesce(p.full_name, u.email, 'Responsavel sem nome') as owner_name,
          count(distinct c.id)::int as children_count,
          count(distinct t.id)::int as tasks_count,
          count(distinct ap.id) filter (where ap.status = 'open')::int as open_periods_count
        from public.children as c
        left join public.profiles as p on p.id = c.owner_user_id
        left join auth.users as u on u.id = c.owner_user_id
        left join public.tasks as t on t.child_id = c.id
        left join public.allowance_periods as ap on ap.child_id = c.id
        where c.owner_user_id is not null
        group by c.owner_user_id, coalesce(p.full_name, u.email, 'Responsavel sem nome')
        order by count(distinct c.id) desc, count(distinct t.id) desc
        limit 8
      ) as families
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_admin_dashboard_snapshot() to authenticated;

comment on function public.get_admin_dashboard_snapshot() is 'Retorna os indicadores do painel administrativo para usuarios autorizados.';