-- ---------------------------------------------------------------------------
-- BGM Daycare — status que avancam sozinhos
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- O status dependia de alguem atualiza-lo a mao: sem isso, o agendamento
-- ficava "solicitado" mesmo depois de acontecer. Agora um job do pg_cron, a
-- cada 5 minutos:
--
--   - solicitado   -> em_andamento, quando chega o horario de INICIO;
--   - em_andamento -> concluido,    quando passa o horario de TERMINO.
--
-- Sem data final (Hotel com saida em aberto, Creche sem horario de saida no
-- plano), o agendamento nunca e concluido sozinho: fica em andamento ate
-- alguem concluir ou informar o fim. Cancelado e concluido nunca mudam.
--
-- POR QUE NO BANCO, E NAO NO APP
--
-- Roda com o app fechado, nao custa nada (o cron da Vercel gratuito so roda
-- uma vez por dia) e nenhuma chave sai do banco — uma rota do app precisaria
-- da service_role no servidor. E a regra fica junto das outras regras de
-- agendamento.
--
-- Na primeira execucao, todo agendamento cujo horario ja passou avanca —
-- inclusive os antigos (decidido com a equipe em out/2026).
--
-- Rode inteiro, de uma vez (esta numa transacao). Pode rodar de novo: o
-- `cron.schedule` com nome substitui o job existente. Os jobs e o historico
-- de execucoes aparecem no painel em Integrations -> Cron.
-- ---------------------------------------------------------------------------

begin;

-- ── 1. pg_cron ────────────────────────────────────────────────────────────
-- Comando da documentacao do Supabase (guides/cron/install).

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;


-- ── 2. A regra ────────────────────────────────────────────────────────────

create or replace function public.avancar_status_agendamentos()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Chegou o inicio.
  update agendamentos
     set status = 'em_andamento'
   where status = 'solicitado'
     and data_hora_inicio <= now();

  -- Passou o fim. Vem depois do passo anterior de proposito: um solicitado
  -- cujo fim ja passou (job parado, agendamento lancado depois do fato)
  -- chega a concluido na mesma execucao. Fim nulo nunca casa com o `<`.
  update agendamentos
     set status = 'concluido'
   where status = 'em_andamento'
     and data_hora_fim < now();
end $$;

comment on function public.avancar_status_agendamentos() is
  'Job do pg_cron (a cada 5 min): solicitado -> em_andamento no inicio, em_andamento -> concluido no termino.';

-- So o job chama. Fechada como a do script 07: toda funcao em `public` vira
-- endpoint do PostgREST, e o Supabase concede EXECUTE a anon/authenticated.
-- O job roda como `postgres`, dono das tabelas (e por isso fora do RLS).
revoke execute on function public.avancar_status_agendamentos()
  from public, anon, authenticated;


-- ── 3. Sync com o Google so quando o evento muda ──────────────────────────
--
-- O evento no Google nao mostra o status: do status, so o cancelamento
-- importa (apaga o evento; descancelar recria). Sem o WHEN, cada agendamento
-- dispararia duas chamadas inuteis por dia, uma a cada avanco do job.
--
-- Edicoes pelo app continuam sincronizando: `atualizar_agendamento` regrava
-- `agendamento_animais`, cujos triggers ja sincronizam.

drop trigger if exists trg_sync_agenda on public.agendamentos;

create trigger trg_sync_agenda
  after update of data_hora_inicio, data_hora_fim, status, observacoes
  on public.agendamentos
  for each row
  when (
       old.data_hora_inicio is distinct from new.data_hora_inicio
    or old.data_hora_fim    is distinct from new.data_hora_fim
    or old.observacoes      is distinct from new.observacoes
    or (old.status = 'cancelado') is distinct from (new.status = 'cancelado')
  )
  execute function public.disparar_sync_agenda();


-- ── 4. Agendamento dos jobs ───────────────────────────────────────────────

select cron.schedule(
  'avancar-status-agendamentos',
  '*/5 * * * *',
  $$select public.avancar_status_agendamentos()$$
);

-- O pg_cron nao limpa o proprio historico: a cada 5 min sao 288 linhas por
-- dia em `cron.job_run_details`. Guarda 7 dias. O cron do Supabase usa UTC:
-- 06:00 UTC = 03:00 em Sao Paulo.
select cron.schedule(
  'limpar-historico-cron',
  '0 6 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);

commit;
