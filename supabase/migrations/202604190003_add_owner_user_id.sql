alter table public.children add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.tasks add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.allowance_periods add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.period_summaries add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.task_logs add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.task_log_events add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;

create index if not exists children_owner_user_id_idx on public.children (owner_user_id);
create index if not exists tasks_owner_user_id_idx on public.tasks (owner_user_id);
create index if not exists allowance_periods_owner_user_id_idx on public.allowance_periods (owner_user_id);
create index if not exists period_summaries_owner_user_id_idx on public.period_summaries (owner_user_id);
create index if not exists task_logs_owner_user_id_idx on public.task_logs (owner_user_id);
create index if not exists task_log_events_owner_user_id_idx on public.task_log_events (owner_user_id);

alter table public.children enable row level security;
alter table public.tasks enable row level security;
alter table public.allowance_periods enable row level security;
alter table public.period_summaries enable row level security;
alter table public.task_logs enable row level security;
alter table public.task_log_events enable row level security;

create or replace function public.claim_legacy_family_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  already_has_children boolean := false;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select exists (
    select 1
    from public.children
    where owner_user_id = current_user_id
  ) into already_has_children;

  if already_has_children then
    return;
  end if;

  update public.children
  set owner_user_id = current_user_id
  where owner_user_id is null;

  update public.tasks as t
  set owner_user_id = current_user_id
  where t.owner_user_id is null
    and exists (
      select 1
      from public.children as c
      where c.id = t.child_id
        and c.owner_user_id = current_user_id
    );

  update public.allowance_periods as ap
  set owner_user_id = current_user_id
  where ap.owner_user_id is null
    and exists (
      select 1
      from public.children as c
      where c.id = ap.child_id
        and c.owner_user_id = current_user_id
    );

  update public.period_summaries as ps
  set owner_user_id = current_user_id
  where ps.owner_user_id is null
    and exists (
      select 1
      from public.children as c
      where c.id = ps.child_id
        and c.owner_user_id = current_user_id
    );

  update public.task_logs as tl
  set owner_user_id = current_user_id
  where tl.owner_user_id is null
    and exists (
      select 1
      from public.children as c
      where c.id = tl.child_id
        and c.owner_user_id = current_user_id
    );

  update public.task_log_events as tle
  set owner_user_id = current_user_id
  where tle.owner_user_id is null
    and exists (
      select 1
      from public.children as c
      where c.id = tle.child_id
        and c.owner_user_id = current_user_id
    );
end;
$$;

grant execute on function public.claim_legacy_family_data() to authenticated;

drop policy if exists "Children owner full access" on public.children;
create policy "Children owner full access" on public.children
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Tasks owner full access" on public.tasks;
create policy "Tasks owner full access" on public.tasks
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Periods owner full access" on public.allowance_periods;
create policy "Periods owner full access" on public.allowance_periods
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Period summaries owner full access" on public.period_summaries;
create policy "Period summaries owner full access" on public.period_summaries
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Task logs owner full access" on public.task_logs;
create policy "Task logs owner full access" on public.task_logs
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Task log events owner full access" on public.task_log_events;
create policy "Task log events owner full access" on public.task_log_events
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

comment on column public.children.owner_user_id is 'Usuario responsavel dono do cadastro.';
comment on column public.tasks.owner_user_id is 'Usuario responsavel dono da tarefa.';
comment on column public.allowance_periods.owner_user_id is 'Usuario responsavel dono do periodo.';
comment on column public.period_summaries.owner_user_id is 'Usuario responsavel dono do resumo.';
comment on column public.task_logs.owner_user_id is 'Usuario responsavel dono do log.';
comment on column public.task_log_events.owner_user_id is 'Usuario responsavel dono do evento historico.';
comment on function public.claim_legacy_family_data() is 'Atribui dados legados sem owner_user_id ao primeiro responsavel autenticado que ainda nao possui criancas.';