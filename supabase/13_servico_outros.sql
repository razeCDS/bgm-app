-- ---------------------------------------------------------------------------
-- BGM Daycare — servico "Outros" (no lugar do "passeio")
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- O "passeio" foi criado para um cliente so. Em vez de um servico por
-- excecao, fica um "Outros" generico: o que ele e, a equipe escreve nas
-- observacoes do agendamento.
--
-- Regras do "Outros" (decididas com a equipe em out/2026):
--   - sempre sozinho, como a Visita;
--   - nao muda depois de criado (e principal, como Creche, Hotel e Visita);
--   - tem valor livre;
--   - observacoes obrigatorias.
--
-- POR QUE RENOMEAR, E NAO CRIAR OUTRO VALOR
--
-- O Postgres nao remove valor de enum. Nenhum agendamento usava `passeio`
-- (conferido em out/2026), entao renomear troca um pelo outro sem sobra.
--
-- Rode inteiro, de uma vez (esta numa transacao). Depois, publique a Edge
-- Function `sincronizar-agenda` atualizada (rotulo "Outros").
-- ---------------------------------------------------------------------------

begin;

-- ── 1. O valor ────────────────────────────────────────────────────────────

alter type public.servico_agendamento rename value 'passeio' to 'outros';


-- ── 2. Regras ─────────────────────────────────────────────────────────────
--
-- Mesma funcao do script 09, com duas regras a mais: Outros sozinho e
-- Outros com observacoes.

create or replace function public.validar_servicos_agendamento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_fuso        constant text := 'America/Sao_Paulo';
  v_id          uuid;
  v_servicos    servico_agendamento[];
  v_primeiro    date;
  v_ultimo      date;
  v_observacoes text;
  v_msg         text;
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
         (coalesce(data_hora_fim, data_hora_inicio) at time zone v_fuso)::date,
         observacoes
    into v_primeiro, v_ultimo, v_observacoes
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
    when 'outros' = any(v_servicos) and cardinality(v_servicos) > 1 then
      'Outros não pode ser combinado com outros serviços.'
    when 'outros' = any(v_servicos) and nullif(btrim(v_observacoes), '') is null then
      'Descreva o serviço nas observações.'
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
              and (servico in ('creche', 'hotel', 'visita', 'outros')
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

-- Passa a rodar tambem quando as observacoes mudam: apagar a descricao de
-- um "Outros" ja salvo tem de ser recusado.
drop trigger trg_validar_servicos_agendamento on public.agendamentos;
create constraint trigger trg_validar_servicos_agendamento
  after insert or update of data_hora_inicio, data_hora_fim, observacoes
  on public.agendamentos
  deferrable initially deferred
  for each row execute function public.validar_servicos_agendamento();


-- ── 3. Edicao: Outros e principal ─────────────────────────────────────────
--
-- Mesma funcao do script 08; muda so a lista de principais e a mensagem.

create or replace function public.atualizar_agendamento(
  p_id               uuid,
  p_animal_ids       uuid[],
  p_servicos         jsonb,
  p_data_hora_inicio timestamptz,
  p_data_hora_fim    timestamptz default null,
  p_status           status_agendamento default 'solicitado',
  p_observacoes      text default null,
  p_plano            jsonb default null,
  p_pertences        jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_antes  text;
  v_depois text;
begin
  if p_animal_ids is null or array_length(p_animal_ids, 1) is null then
    raise exception 'Selecione ao menos um animal.';
  end if;

  -- Principais (Creche, Hotel, Visita, Outros) nao mudam: definem horario,
  -- plano, pertences e a serie. Extras entram e saem livremente.
  select coalesce(string_agg(servico::text, ',' order by servico), '')
    into v_antes
    from agendamento_servicos
   where agendamento_id = p_id
     and servico in ('creche', 'hotel', 'visita', 'outros');

  select coalesce(string_agg(s ->> 'servico', ','
                    order by (s ->> 'servico')::servico_agendamento), '')
    into v_depois
    from jsonb_array_elements(coalesce(p_servicos, '[]'::jsonb)) s
   where s ->> 'servico' in ('creche', 'hotel', 'visita', 'outros');

  if v_antes <> v_depois then
    raise exception using
      errcode = 'check_violation',
      message = 'Creche, Hotel, Visita e Outros não podem ser alterados depois de criado o agendamento. Cancele este e crie outro.',
      hint    = 'mensagem_para_usuario';
  end if;

  update agendamentos
     set data_hora_inicio = p_data_hora_inicio,
         data_hora_fim    = p_data_hora_fim,
         status           = p_status,
         observacoes      = p_observacoes
   where id = p_id;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  -- Apaga e reinsere: o conjunto de caes pode ter mudado. Como estamos numa
  -- transacao, a constraint enxerga o estado final, e nao um intermediario.
  delete from agendamento_animais where agendamento_id = p_id;

  insert into agendamento_animais (
    agendamento_id, animal_id, data_hora_inicio, data_hora_fim, status
  )
  select p_id, a, p_data_hora_inicio, p_data_hora_fim, p_status
  from unnest(p_animal_ids) a;

  perform public.gravar_servicos_agendamento(p_id, p_servicos);
  perform public.gravar_relacionados_agendamento(p_id, p_plano, p_pertences);

  return p_id;
end $$;

-- `create or replace` mantem os grants, mas o script 12 fechou as funcoes
-- de trigger: repete o revoke por garantia, ja que a validacao foi recriada.
revoke execute on function public.validar_servicos_agendamento()
  from public, anon, authenticated;

commit;
