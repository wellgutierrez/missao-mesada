-- Missao Mesada
-- Apaga todos os registros do sistema para recomecar do zero em ambiente de teste.
-- Execute no SQL Editor do Supabase.
-- Atencao: isto remove todas as criancas, tarefas, periodos, logs, perfis e usuarios de autenticacao.

begin;

truncate table public.task_log_events restart identity cascade;
truncate table public.task_logs restart identity cascade;
truncate table public.period_summaries restart identity cascade;
truncate table public.allowance_periods restart identity cascade;
truncate table public.tasks restart identity cascade;
truncate table public.children restart identity cascade;

delete from public.profiles;
delete from auth.users;

commit;