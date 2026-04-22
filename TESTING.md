# Validacao do Projeto

Este projeto ja possui quatro niveis de validacao automatizada:

- `npm run lint`: validacao estatica do codigo.
- `npm test`: testes com Vitest para regras e camada server-side com mocks.
- `npm run test:e2e`: fluxos publicos via Playwright sem depender de Supabase real.
- `npm run test:e2e:live`: fluxos reais autenticados contra um Supabase configurado.
- `npm run validate`: roda lint + Vitest + Playwright publico.
- `npm run validate:live`: roda a bateria principal e depois a suite live.

## Ordem recomendada

Para uma validacao completa no dia a dia, rode nesta ordem:

```bash
npm run lint
npm test
npm run test:e2e
```

Ou use o atalho:

```bash
npm run validate
```

Se o ambiente real estiver configurado, rode tambem:

```bash
npm run test:e2e:live
```

Ou use o atalho completo:

```bash
npm run validate:live
```

## Configuracao minima para a suite live

Preencha `.env.local` com base em `.env.example`.

Obrigatorias para rodar o app com Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Obrigatorias para a suite live:

- `E2E_LIVE_EMAIL`
- `E2E_LIVE_PASSWORD`

Opcionais para controlar os dados inseridos pela suite live:

- `E2E_LIVE_CHILD_NAME`
- `E2E_LIVE_PROFILE_NAME`
- `E2E_LIVE_PROFILE_PHONE`

## Migrations obrigatorias no Supabase

Para o painel administrativo analitico e o fechamento real de periodos funcionarem no ambiente remoto, estas migrations precisam estar aplicadas:

- `supabase/migrations/202604220010_fix_admin_dashboard_rewards_metric_schema_compat.sql`
- `supabase/migrations/202604220011_align_period_summaries_with_app_schema.sql`

Se alguma delas estiver ausente no projeto remoto, o painel admin pode quebrar em runtime ou o fluxo de encerramento de periodo pode falhar ao salvar o resumo.

## O que a suite live valida hoje

- login real
- criacao de crianca
- atualizacao de perfil
- criacao de periodo
- criacao de tarefa bonus
- registro de tarefa bonus no periodo
- atualizacao de recompensa do periodo
- encerramento do periodo com validacao do historico

## Limpeza de dados de teste

Os testes live que criam criancas tentam excluir automaticamente o perfil criado ao final.

Mesmo assim, como a suite roda contra um ambiente real, vale usar:

- uma conta separada de testes
- um projeto Supabase de homologacao ou staging

## Problema conhecido no ambiente atual

O repositorio ainda esta dentro do OneDrive. Isso pode causar erros intermitentes em `.next`, como `EINVAL`, durante build ou execucao do servidor.

Se isso acontecer:

```bash
Remove-Item -Recurse -Force .next
```

Depois rode o comando novamente.

Atalhos disponiveis no projeto:

```bash
npm run clean
npm run build:clean
```

O primeiro remove a pasta `.next` antes de uma nova rodada. O segundo executa essa limpeza e inicia o build em seguida.

A correcao definitiva e mover o projeto para fora do OneDrive.

## Checklist de homologacao

Antes de considerar uma entrega segura, confirme:

1. `npm run lint` passou.
2. `npm test` passou.
3. `npm run test:e2e` passou.
4. `npm run test:e2e:live` passou no ambiente de homologacao.
5. Login e cadastro funcionam com a configuracao real do Supabase.
6. Criacao de crianca funciona e retorna ao painel.
7. Perfil salva nome e celular corretamente.
8. Periodo pode ser aberto, receber tarefa, registrar bonus e ser encerrado.
9. Historico do periodo aparece com os valores esperados.
10. Nenhum erro de `.next` ou travamento por OneDrive ocorreu durante a rodada final.

## Checklist final de aprovacao

Use esta sequencia curta antes de liberar para producao com risco baixo:

1. Rode `npm run build:clean`.
2. Rode `npm run validate`.
3. Rode `npm run validate:live` com `.env.local` real de homologacao.
4. Confirme que as migrations do Supabase foram aplicadas no ambiente correto.
5. Verifique se a tabela `public.admin_users` contem os usuarios `owner` e `manager` esperados.
6. Execute uma rodada manual com conta real: login, cadastro, criar crianca, editar perfil, abrir periodo, registrar tarefa, encerrar periodo e validar historico.
7. Faça a rodada final fora do OneDrive, se possivel.

Se todos os itens acima estiverem verdes, o projeto pode ser tratado como pronto para producao com risco baixo.

## Checklist de 2 minutos

Se voce precisa decidir rapido se pode liberar, confira estes bloqueadores:

1. `npm run build:clean` passou.
2. `npm run validate` passou.
3. `npm run validate:live` passou no ambiente real de homologacao.
4. Login, cadastro e fluxo principal da crianca funcionaram manualmente com conta real.
5. O ambiente final nao esta falhando por causa de OneDrive, `.next` ou configuracao ausente do Supabase.

Se qualquer item acima falhar, trate como bloqueio de producao.

## Go / No-Go

Marque cada item com `sim` ou `nao` antes da liberacao:

1. `npm run build:clean` passou?
2. `npm run validate` passou?
3. `npm run validate:live` passou no ambiente de homologacao?
4. Login e cadastro funcionaram com credenciais reais?
5. Criacao de crianca, perfil, periodo, tarefa e historico funcionaram manualmente?
6. `public.admin_users` esta correta no ambiente real?
7. Nao ha erro de ambiente relacionado a OneDrive, `.next` ou variaveis ausentes?

Decisao:

- Se todos os itens forem `sim`, resultado: `GO`.
- Se qualquer item for `nao`, resultado: `NO-GO`.
