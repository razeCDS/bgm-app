-- ---------------------------------------------------------------------------
-- BGM Daycare — extras num dia especifico da hospedagem
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- O Hotel e um agendamento so, do check-in ao check-out, e os extras
-- marcados valiam para a estadia inteira, sem dia. Mas o banho costuma ter
-- dia certo (o ultimo, antes da saida), e as vezes acontece mais de uma vez
-- na mesma hospedagem.
--
-- Agora cada servico pode ter um DIA (`agendamento_servicos.data`):
--   - nulo  = vale para o agendamento todo (como antes);
--   - um dia = aquele dia da estadia. So extras de Hotel tem dia — na Creche
--     cada dia ja e uma ocorrencia propria, e o extra vai direto nela.
--
-- O mesmo extra pode aparecer uma vez sem dia e uma vez por dia (UNIQUE com
-- NULLS NOT DISTINCT). O dia precisa cair dentro da estadia, contada no fuso
-- da creche: do dia de entrada ao de saida, ou so o de entrada se nao houver
-- data final.
--
-- Rode inteiro, de uma vez (esta numa transacao). Depois, publique a Edge
-- Function `sincronizar-agenda` atualizada: ela passa a ler a coluna `data`.
-- ---------------------------------------------------------------------------

begin;

-- ── 1. Coluna e unicidade ─────────────────────────────────────────────────

alter table public.agendamento_servicos add column data date;

comment on column public.agendamento_servicos.data is
  'Dia especifico dentro da estadia (so extras de Hotel). Nulo = o agendamento todo.';

-- Sem o NULLS NOT DISTINCT, dois Banhos sem dia passariam: para o UNIQUE
-- comum, nulo nunca e igual a nulo.
alter table public.agendamento_servicos drop constraint uq_agendamento_servico;
alter table public.agendamento_servicos
  add constraint uq_agendamento_servico
  unique nulls not distinct (agendamento_id, servico, data);


-- ── 2. Regras ─────────────────────────────────────────────────────────────
--
-- Mesma funcao do script 08, com duas regras a mais (dia so em extra de
-- Hotel; dia dentro da estadia) e as combinacoes olhando servicos DISTINTOS
-- — um Banho em dois dias e um servico so.

create or replace function public.validar_servicos_agendamento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_fuso     constant text := 'America/Sao_Paulo';
  v_id       uuid;
  v_servicos servico_agendamento[];
  v_primeiro date;
  v_ultimo   date;
  v_msg      text;
begin
  -- Ramos separados de proposito: `new.id` nao existe nas tabelas filhas, e
  -- `new` e nulo no DELETE.
  if tg_table_name = 'agendamentos' then
    v_id := new.id;
  elsif tg_op = 'DELETE' then
    v_id := old.agendamento_id;
  else
    v_id := new.agendamento_id;
  end if;

  select (data_hora_inicio at time zone v_fuso)::date,
         (coalesce(data_hora_fim, data_hora_inicio) at time zone v_fuso)::date
    into v_primeiro, v_ultimo
    from agendamentos
   where id = v_id;

  -- Agendamento apagado (cascade): nao ha o que validar.
  if not found then
    return null;
  end if;

  select coalesce(array_agg(distinct servico), '{}')
    into v_servicos
    from agendamento_servicos
   where agendamento_id = v_id;

  v_msg := case
    when cardinality(v_servicos) = 0 then
      'Selecione ao menos um serviço.'
    when 'creche' = any(v_servicos) and 'hotel' = any(v_servicos) then
      'Creche e Hotel não podem ser marcados juntos.'
    when 'visita' = any(v_servicos) and cardinality(v_servicos) > 1 then
      'Visita não pode ser combinada com outros serviços.'
    when not ('creche' = any(v_servicos))
         and exists (select 1 from planos_estadia where agendamento_id = v_id) then
      'Plano de estadia só existe em agendamentos com Creche.'
    when not (v_servicos && array['creche', 'hotel']::servico_agendamento[])
         and exists (select 1 from pertences_deixados where agendamento_id = v_id) then
      'Pertences deixados só existem em agendamentos de Creche ou Hotel.'
    when exists (
           select 1 from agendamento_servicos
            where agendamento_id = v_id
              and data is not null
              and (servico in ('creche', 'hotel', 'visita')
                   or not ('hotel' = any(v_servicos)))) then
      'Dia específico só existe para extras em agendamentos de Hotel.'
    when exists (
           select 1 from agendamento_servicos
            where agendamento_id = v_id
              and data not between v_primeiro and v_ultimo) then
      'Há serviço marcado num dia fora do período da hospedagem.'
  end;

  if v_msg is not null then
    -- O `hint` diz ao app que a mensagem ja esta escrita para a equipe.
    raise exception using
      errcode = 'check_violation',
      message = v_msg,
      hint    = 'mensagem_para_usuario';
  end if;

  return null;
end $$;

-- Passa a rodar tambem quando as datas mudam: encurtar a estadia nao pode
-- deixar um banho marcado num dia que saiu dela.
drop trigger trg_validar_servicos_agendamento on public.agendamentos;
create constraint trigger trg_validar_servicos_agendamento
  after insert or update of data_hora_inicio, data_hora_fim on public.agendamentos
  deferrable initially deferred
  for each row execute function public.validar_servicos_agendamento();


-- ── 3. Gravacao ───────────────────────────────────────────────────────────

-- `p_servicos`: [{"servico": "banho", "valor": 70, "data": "2026-08-22"}]
create or replace function public.gravar_servicos_agendamento(
  p_id       uuid,
  p_servicos jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from agendamento_servicos where agendamento_id = p_id;

  insert into agendamento_servicos (agendamento_id, servico, valor, data)
  select p_id,
         (s ->> 'servico')::servico_agendamento,
         nullif(s ->> 'valor', '')::numeric,
         nullif(s ->> 'data', '')::date
    from jsonb_array_elements(coalesce(p_servicos, '[]'::jsonb)) s;
end $$;

commit;
