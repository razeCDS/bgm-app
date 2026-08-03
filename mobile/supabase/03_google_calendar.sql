-- ---------------------------------------------------------------------------
-- BGM Daycare — espelhamento no Google Agenda
--
-- Liga o trigger que chama a Edge Function `sincronizar-agenda`.
--
-- ATENCAO — rode este script SOMENTE depois de:
--   1. a Edge Function estar publicada e respondendo;
--   2. os secrets GOOGLE_SERVICE_ACCOUNT e GOOGLE_CALENDAR_ID cadastrados;
--   3. o calendario compartilhado com o e-mail da service account.
--
-- Antes disso o trigger so produziria erros em `google_sync_erro`.
-- ---------------------------------------------------------------------------

-- Necessaria para o trigger fazer chamadas HTTP.
create extension if not exists pg_net with schema extensions;


-- ---------------------------------------------------------------------------
-- Configuracao
--
-- A URL e a chave ficam em configuracao do banco em vez de hardcoded, para
-- o script poder ser versionado sem expor segredo.
--
-- Rode UMA VEZ, trocando os valores (o painel mostra ambos em
-- Settings > API):
--
--   alter database postgres set app.supabase_url        = 'https://SEU.supabase.co';
--   alter database postgres set app.supabase_service_key = 'SUA_SERVICE_ROLE_KEY';
-- ---------------------------------------------------------------------------

create or replace function public.disparar_sync_agenda()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url  text := current_setting('app.supabase_url', true);
  v_key  text := current_setting('app.supabase_service_key', true);
begin
  if v_url is null or v_key is null then
    -- Sem configuracao, nao sincroniza — mas nunca impede o agendamento.
    raise warning 'sync agenda ignorado: app.supabase_url/service_key nao configurados';
    return new;
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/sincronizar-agenda',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := jsonb_build_object(
                 'type',   tg_op,
                 'table',  tg_table_name,
                 'record', to_jsonb(new)
               )
  );

  return new;
end $$;


-- ---------------------------------------------------------------------------
-- Trigger
--
-- CRITICO: o `update of` lista apenas colunas de NEGOCIO.
--
-- A Edge Function grava `google_calendar_event_id`, `google_sync_em` e
-- `google_sync_erro` de volta na linha. Se essas colunas estivessem no
-- gatilho, cada escrita redispararia o webhook — laco infinito.
-- ---------------------------------------------------------------------------

drop trigger if exists trg_sync_agenda on public.agendamentos;

create trigger trg_sync_agenda
  after insert or update of
    animal_id, tipo, data_hora_inicio, data_hora_fim, status, observacoes
  on public.agendamentos
  for each row
  execute function public.disparar_sync_agenda();


-- ---------------------------------------------------------------------------
-- Para DESLIGAR o espelhamento sem mexer no app:
--   drop trigger if exists trg_sync_agenda on public.agendamentos;
-- ---------------------------------------------------------------------------
