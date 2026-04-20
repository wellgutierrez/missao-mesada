-- Missao Mesada
-- Limpa todos os dados do app para recomecar do zero sem apagar as tabelas.
-- Execute no SQL Editor do Supabase.

begin;

truncate table public.task_log_events restart identity cascade;
truncate table public.task_logs restart identity cascade;
truncate table public.period_summaries restart identity cascade;
truncate table public.allowance_periods restart identity cascade;
truncate table public.tasks restart identity cascade;
truncate table public.children restart identity cascade;

commit;

-- Opcional:
-- Se voce quiser refazer tambem o cadastro da conta com o mesmo email,
-- exclua o usuario antigo em Authentication > Users no painel do Supabase.
-- O ideal e fazer isso pelo painel para evitar apagar contas erradas.