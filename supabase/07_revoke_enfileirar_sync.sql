-- ---------------------------------------------------------------------------
-- BGM Daycare — fecha a RPC publica de `enfileirar_sync_agenda`
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- Toda funcao em `public` vira endpoint do PostgREST, e o Postgres concede
-- EXECUTE a `public` por padrao. Como `enfileirar_sync_agenda` e SECURITY
-- DEFINER, qualquer um com a chave publicavel podia chamar
--
--   POST /rest/v1/rpc/enfileirar_sync_agenda
--
-- em loop, disparando a Edge Function (com a service_role) e chamadas ao
-- Google. Nao vaza dados, mas e uma torneira aberta — e com o app web a chave
-- publicavel fica dentro do bundle, ao alcance de qualquer visitante.
--
-- POR QUE OS TRIGGERS CONTINUAM FUNCIONANDO
--
-- Quem chama esta funcao sao so os triggers de sync (`disparar_sync_agenda`,
-- `sync_animais_inseridos`, `sync_animais_removidos`), todos SECURITY DEFINER
-- e de dono `postgres` — rodam como `postgres`, que mantem o EXECUTE.
-- Verificado gravando como `authenticated`: a fila do pg_net recebeu a chamada.
--
-- As outras 5 funcoes que o linter aponta retornam `trigger`/`event_trigger`:
-- o Postgres se recusa a executa-las fora de um trigger, entao a RPC nao abre
-- nada. Ficam como estao.
-- ---------------------------------------------------------------------------

revoke execute on function public.enfileirar_sync_agenda(uuid)
  from public, anon, authenticated;
