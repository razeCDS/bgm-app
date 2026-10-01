-- ---------------------------------------------------------------------------
-- BGM Daycare — escrita atomica de agendamento
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- O app gravava um agendamento em 4 chamadas PostgREST separadas:
--   1. insert em `agendamentos`
--   2. insert em `agendamento_animais`
--   3. insert em `planos_estadia`
--   4. insert em `pertences_deixados`
--
-- Cada chamada e a sua propria transacao. Quando a constraint
-- `excl_animal_sem_sobreposicao_juncao` rejeitava o passo 2, o passo 1 ja
-- estava comitado — sobrando um agendamento ORFAO, sem nenhum cao, invisivel
-- na lista (que exibe pelos animais) mas presente no banco.
--
-- Com as funcoes abaixo tudo roda numa transacao so: ou grava inteiro, ou
-- nao grava nada.
--
-- Sintomas de que voce precisa disto (consulta de diagnostico):
--
--   select a.* from agendamentos a
--   where not exists (
--     select 1 from agendamento_animais j where j.agendamento_id = a.id
--   );
-- ---------------------------------------------------------------------------

create or replace function public.gravar_relacionados_agendamento(
  p_id        uuid,
  p_plano     jsonb,
  p_pertences jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from planos_estadia where agendamento_id = p_id;
  delete from pertences_deixados where agendamento_id = p_id;

  if p_plano is not null then
    insert into planos_estadia (
      agendamento_id, tipo_plano, total_dias, horario_entrada,
      horario_saida, forma_pagamento, valor_total
    )
    values (
      p_id,
      nullif(p_plano ->> 'tipo_plano', '')::tipo_plano,
      nullif(p_plano ->> 'total_dias', '')::int,
      nullif(p_plano ->> 'horario_entrada', '')::time,
      nullif(p_plano ->> 'horario_saida', '')::time,
      nullif(p_plano ->> 'forma_pagamento', '')::forma_pagamento,
      nullif(p_plano ->> 'valor_total', '')::numeric
    );
  end if;

  if p_pertences is not null then
    insert into pertences_deixados (
      agendamento_id, tem_caminha, cor_caminha, tem_roupa, cor_roupa,
      tem_brinquedo, qual_brinquedo, racao, quantidade, vezes, observacoes
    )
    values (
      p_id,
      (p_pertences ->> 'tem_caminha')::boolean,
      p_pertences ->> 'cor_caminha',
      (p_pertences ->> 'tem_roupa')::boolean,
      p_pertences ->> 'cor_roupa',
      (p_pertences ->> 'tem_brinquedo')::boolean,
      p_pertences ->> 'qual_brinquedo',
      p_pertences ->> 'racao',
      p_pertences ->> 'quantidade',
      p_pertences ->> 'vezes',
      p_pertences ->> 'observacoes'
    );
  end if;
end $$;


create or replace function public.criar_agendamento(
  p_animal_ids       uuid[],
  p_tipo             tipo_agendamento,
  p_data_hora_inicio timestamptz,
  p_data_hora_fim    timestamptz default null,
  p_status           status_agendamento default 'solicitado',
  p_observacoes      text default null,
  p_plano            jsonb default null,
  p_pertences        jsonb default null
)
returns uuid
language plpgsql
security invoker           -- respeita a RLS do usuario que chamou
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_animal_ids is null or array_length(p_animal_ids, 1) is null then
    raise exception 'Selecione ao menos um animal.';
  end if;

  insert into agendamentos (
    tipo, data_hora_inicio, data_hora_fim, status, recorrente,
    dias_semana_recorrencia, observacoes
  )
  values (
    p_tipo, p_data_hora_inicio, p_data_hora_fim, p_status, false,
    null, p_observacoes
  )
  returning id into v_id;

  -- Se a constraint de sobreposicao barrar aqui, o insert acima e desfeito.
  insert into agendamento_animais (
    agendamento_id, animal_id, data_hora_inicio, data_hora_fim, status
  )
  select v_id, a, p_data_hora_inicio, p_data_hora_fim, p_status
  from unnest(p_animal_ids) a;

  perform public.gravar_relacionados_agendamento(v_id, p_plano, p_pertences);

  return v_id;
end $$;


create or replace function public.atualizar_agendamento(
  p_id               uuid,
  p_animal_ids       uuid[],
  p_tipo             tipo_agendamento,
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
begin
  if p_animal_ids is null or array_length(p_animal_ids, 1) is null then
    raise exception 'Selecione ao menos um animal.';
  end if;

  update agendamentos
     set tipo             = p_tipo,
         data_hora_inicio = p_data_hora_inicio,
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

  perform public.gravar_relacionados_agendamento(p_id, p_plano, p_pertences);

  return p_id;
end $$;


revoke all on function public.criar_agendamento(
  uuid[], tipo_agendamento, timestamptz, timestamptz, status_agendamento,
  text, jsonb, jsonb
) from public, anon;
grant execute on function public.criar_agendamento(
  uuid[], tipo_agendamento, timestamptz, timestamptz, status_agendamento,
  text, jsonb, jsonb
) to authenticated;

revoke all on function public.atualizar_agendamento(
  uuid, uuid[], tipo_agendamento, timestamptz, timestamptz,
  status_agendamento, text, jsonb, jsonb
) from public, anon;
grant execute on function public.atualizar_agendamento(
  uuid, uuid[], tipo_agendamento, timestamptz, timestamptz,
  status_agendamento, text, jsonb, jsonb
) to authenticated;
