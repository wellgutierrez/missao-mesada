Testes E2E do projeto.

Comandos:

- `npm run test:e2e`: roda a suite publica que nao depende de Supabase real.
- `npm run test:e2e:live`: roda o fluxo autenticado real contra um projeto Supabase configurado.

Para usar `npm run test:e2e:live`, configure estas variaveis no ambiente antes de executar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `E2E_LIVE_EMAIL`
- `E2E_LIVE_PASSWORD`
- `E2E_LIVE_CHILD_NAME` (opcional, para controlar o nome usado no teste de criacao de crianca)
- `E2E_LIVE_PROFILE_NAME` (opcional, nome usado no teste live de perfil)
- `E2E_LIVE_PROFILE_PHONE` (opcional, celular usado no teste live de perfil)

Observacoes:

- O teste live usa uma conta existente e valida o fluxo de login ate o dashboard principal.
- A mesma suite tambem cobre a criacao de uma crianca autenticada.
- A mesma suite tambem cobre a atualizacao do perfil autenticado.
- A mesma suite tambem cobre ciclo de periodo real: criar periodo, criar tarefa bonus, registrar ocorrencia, ajustar recompensa e encerrar no historico.
- Os testes live que criam criancas tentam excluir automaticamente o perfil criado ao final de cada execucao.
- Se as variaveis nao estiverem definidas, a suite live sera marcada como skip.
- Para testes locais completos com Supabase, o caminho recomendado continua sendo subir o stack local via Docker Desktop e `npx supabase start`.