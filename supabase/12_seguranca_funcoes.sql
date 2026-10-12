-- ---------------------------------------------------------------------------
-- BGM Daycare — funcoes internas fora da API
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- Toda funcao em `public` vira endpoint do PostgREST (/rest/v1/rpc/...), e o
-- Supabase concede EXECUTE a anon/authenticated por padrao. O linter aponta:
--
--   - as cinco funcoes de TRIGGER e a de event trigger `rls_auto_enable`
--     (cinco das seis sao SECURITY DEFINER). Nao sao exploraveis — o
--     Postgres se recusa a executa-las fora de um trigger —, mas nao ha
--     motivo para expo-las;
--   - `gravar_relacionados_agendamento`, auxiliar das RPCs de gravacao, que o
--     visitante anonimo consegue chamar (o RLS barra a escrita, mas nao
--     deveria nem chegar la);
--   - `periodo_agendamento` sem `search_path` fixo.
--
-- POR QUE OS TRIGGERS CONTINUAM FUNCIONANDO
--
-- O Postgres confere o EXECUTE da funcao so ao CRIAR o trigger, nao quando
-- ele dispara. Revogar aqui nao muda nada no funcionamento: so fecha as
-- rotas da API e limpa os avisos.
--
-- FICA DE FORA
--
-- O aviso "btree_gist no schema public": mover a extensao mexeria na
-- protecao contra dupla reserva (EXCLUDE), e o risco e maior que o ganho.
--
-- Rode inteiro, de uma vez (esta numa transacao).
-- ---------------------------------------------------------------------------

begin;

-- ── 1. Funcoes de trigger: ninguem chama pela API ─────────────────────────

revoke execute on function public.disparar_sync_agenda()            from public, anon, authenticated;
revoke execute on function public.sincronizar_animais_agendamento() from public, anon, authenticated;
revoke execute on function public.sync_animais_inseridos()          from public, anon, authenticated;
revoke execute on function public.sync_animais_removidos()          from public, anon, authenticated;
revoke execute on function public.validar_servicos_agendamento()    from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()                 from public, anon, authenticated;


-- ── 2. Auxiliar das RPCs: so quem esta logado ─────────────────────────────
--
-- `authenticated` continua com EXECUTE: as RPCs de gravacao sao SECURITY
-- INVOKER e a chamam com os privilegios de quem chamou (como a
-- `gravar_servicos_agendamento` no script 08).

revoke execute on function public.gravar_relacionados_agendamento(uuid, jsonb, jsonb)
  from public, anon;


-- ── 3. search_path fixo ───────────────────────────────────────────────────
--
-- O corpo so usa `tstzrange`, `greatest`, `coalesce` e `interval`, todos do
-- `pg_catalog`, que e sempre consultado. Mudar a configuracao da funcao nao
-- reconstroi o indice da exclusao.

alter function public.periodo_agendamento(timestamptz, timestamptz)
  set search_path = '';

commit;
