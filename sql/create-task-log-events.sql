-- Missao Mesada
-- Tabela para armazenar o historico detalhado de marcacao e desmarcacao de tarefas.
-- Execute este arquivo no SQL Editor do Supabase apenas se a tabela public.task_log_events ainda nao existir.

create extension if not exists pgcrypto;

create table if not exists public.task_log_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  period_id uuid not null references public.allowance_periods (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  task_type text not null check (task_type in ('bonus', 'discount')),
  action text not null check (action in ('add', 'remove')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists task_log_events_child_id_idx
  on public.task_log_events (child_id);

create index if not exists task_log_events_period_id_idx
  on public.task_log_events (period_id);

create index if not exists task_log_events_task_id_idx
  on public.task_log_events (task_id);

create index if not exists task_log_events_period_created_at_idx
  on public.task_log_events (period_id, created_at desc);

comment on table public.task_log_events is
  'Historico detalhado de cada clique de marcacao ou desmarcacao de tarefa no periodo.';

comment on column public.task_log_events.task_type is
  'Tipo da tarefa no momento do evento: bonus ou discount.';

comment on column public.task_log_events.action is
  'Acao realizada pelo usuario: add para marcar, remove para desmarcar.';

-- A ativacao de owner_user_id, RLS e policies desta tabela acontece em sql/add-owner-user-id.sql.
-- Nao force RLS para disabled aqui: este script auxiliar pode ser executado depois da configuracao
-- principal e acabar enfraquecendo a seguranca da tabela por engano.