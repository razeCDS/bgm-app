-- ---------------------------------------------------------------------------
-- BGM Daycare — RPC de recorrencia (Creche)
--
-- Gera uma linha em `agendamentos` por ocorrencia dentro do periodo, e nao
-- apenas a regra. Todas as ocorrencias da mesma serie compartilham
-- `agendamento_recorrencia_id`, permitindo editar/cancelar uma sem afetar
-- as demais mas ainda sabendo de onde ela veio.
--
-- Convencao dos dias da semana: 0 = domingo ... 6 = sabado
-- (igual a `extract(dow from ...)` do Postgres).
--
-- Rode no SQL Editor do painel do Supabase.
-- ---------------------------------------------------------------------------

create or replace function public.gerar_ocorrencias_recorrencia(
  p_animal_id    uuid,
  p_data_inicio  timestamptz,
  p_data_fim     timestamptz,
  p_dias_semana  int[],
  p_status       status_agendamento default 'solicitado',
  p_observacoes  text default null,
  p_plano        jsonb default null,
  p_pertences    jsonb default null
)
returns uuid[]
language plpgsql
security invoker           -- respeita a RLS do usuario que chamou
set search_path = public
as $$
declare
  v_serie_id       uuid := gen_random_uuid();
  v_ids            uuid[] := '{}';
  v_dia            date;
  v_novo_id        uuid;
  v_hora_entrada   time;
  v_hora_saida     time;
  v_inicio         timestamptz;
  v_fim            timestamptz;
begin
  if p_dias_semana is null or array_length(p_dias_semana, 1) is null then
    raise exception 'Informe ao menos um dia da semana para a recorrencia.';
  end if;

  if p_data_fim is null or p_data_fim < p_data_inicio then
    raise exception 'Periodo invalido: a data final deve ser posterior a inicial.';
  end if;

  -- Horarios vindos do plano de estadia; se ausentes, usa o horario do inicio.
  v_hora_entrada := coalesce(
    nullif(p_plano ->> 'horario_entrada', '')::time,
    p_data_inicio::time
  );
  v_hora_saida := nullif(p_plano ->> 'horario_saida', '')::time;

  for v_dia in
    select d::date
    from generate_series(p_data_inicio::date, p_data_fim::date, interval '1 day') d
    where extract(dow from d)::int = any(p_dias_semana)
  loop
    v_inicio := (v_dia + v_hora_entrada) at time zone current_setting('TimeZone');
    v_fim := case
               when v_hora_saida is null then null
               else (v_dia + v_hora_saida) at time zone current_setting('TimeZone')
             end;

    insert into agendamentos (
      animal_id, tipo, data_hora_inicio, data_hora_fim, status,
      recorrente, dias_semana_recorrencia, agendamento_recorrencia_id,
      observacoes
    )
    values (
      p_animal_id, 'creche', v_inicio, v_fim, p_status,
      false,            -- a ocorrencia e o resultado da regra, nao a regra
      null,
      v_serie_id,
      p_observacoes
    )
    returning id into v_novo_id;

    v_ids := v_ids || v_novo_id;

    -- Plano de estadia da ocorrencia (1:1).
    if p_plano is not null then
      insert into planos_estadia (
        agendamento_id, tipo_plano, total_dias, horario_entrada,
        horario_saida, forma_pagamento, valor_total
      )
      values (
        v_novo_id,
        nullif(p_plano ->> 'tipo_plano', '')::tipo_plano,
        nullif(p_plano ->> 'total_dias', '')::int,
        nullif(p_plano ->> 'horario_entrada', '')::time,
        nullif(p_plano ->> 'horario_saida', '')::time,
        nullif(p_plano ->> 'forma_pagamento', '')::forma_pagamento,
        nullif(p_plano ->> 'valor_total', '')::numeric
      );
    end if;

    -- Pertences deixados da ocorrencia (1:1).
    if p_pertences is not null then
      insert into pertences_deixados (
        agendamento_id, tem_caminha, cor_caminha, tem_roupa, cor_roupa,
        tem_brinquedo, qual_brinquedo, racao, quantidade, vezes, observacoes
      )
      values (
        v_novo_id,
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
  end loop;

  return v_ids;
end $$;

-- Somente usuarios autenticados podem chamar.
revoke all on function public.gerar_ocorrencias_recorrencia(
  uuid, timestamptz, timestamptz, int[], status_agendamento, text, jsonb, jsonb
) from public, anon;

grant execute on function public.gerar_ocorrencias_recorrencia(
  uuid, timestamptz, timestamptz, int[], status_agendamento, text, jsonb, jsonb
) to authenticated;
