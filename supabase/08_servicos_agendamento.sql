-- ---------------------------------------------------------------------------
-- BGM Daycare — servicos no lugar do tipo de agendamento
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- Cada agendamento tinha UM tipo (`visita`, `hotel`, `creche`, `banho`). Na
-- pratica o cliente combina servicos: um dia de creche com banho, um hotel
-- com tosa na saida. Com tipo unico, isso virava dois agendamentos para o
-- mesmo cao no mesmo periodo — que a protecao contra dupla reserva barra.
--
-- Agora o agendamento tem uma LISTA de servicos, cada um com o seu valor:
--
--   creche, hotel, visita          principais: definem a estrutura (horario,
--                                  plano, pertences, recorrencia) e nao mudam
--                                  depois de criado
--   banho, tosa_higienica, consulta extras: sozinhos ou junto de Creche/Hotel
--
-- Combinacoes (validadas no fim da transacao, ver `validar_servicos_agendamento`):
--   - ao menos um servico;
--   - Creche e Hotel se excluem;
--   - Visita fica sozinha e nao tem valor;
--   - plano de estadia so com Creche; pertences so com Creche ou Hotel.
--
-- O VALOR saiu de `planos_estadia.valor_total` e foi para cada servico. Com
-- Creche, continua sendo o valor POR DIA (cada ocorrencia da serie tem sua
-- copia dos servicos).
--
-- Rode inteiro, de uma vez: esta tudo numa transacao, entao ou aplica tudo
-- ou nada. Depois, publique a Edge Function `sincronizar-agenda` atualizada —
-- a versao antiga monta o titulo do evento com a coluna `tipo`, que deixa de
-- existir.
--
-- Aplicado via migracao `servicos_agendamento`.
-- ---------------------------------------------------------------------------

begin;

-- ── 1. Enum e tabela ──────────────────────────────────────────────────────

create type public.servico_agendamento as enum (
  'creche', 'hotel', 'banho', 'tosa_higienica', 'consulta', 'visita'
);

create table public.agendamento_servicos (
  id             uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null
                   references public.agendamentos (id) on delete cascade,
  servico        public.servico_agendamento not null,
  -- Livre e opcional: nao ha tabela de precos.
  valor          numeric,

  -- Tambem serve de indice por `agendamento_id` (coluna da esquerda).
  constraint uq_agendamento_servico unique (agendamento_id, servico),
  constraint chk_valor_nao_negativo check (valor is null or valor >= 0),
  constraint chk_visita_sem_valor check (servico <> 'visita' or valor is null)
);

comment on table public.agendamento_servicos is
  'Servicos de cada agendamento, com o valor de cada um (com Creche, por dia).';

-- Mesma politica das outras tabelas (ver 01_rls_policies.sql).
alter table public.agendamento_servicos enable row level security;

create policy "acesso_autenticado" on public.agendamento_servicos
  for all
  to authenticated
  using (true)
  with check (true);


-- ── 2. Migracao dos dados ─────────────────────────────────────────────────

-- Rede de seguranca: o app nunca gravou pertences fora de Creche/Hotel, mas
-- se houver, a regra nova recusaria esses agendamentos na proxima edicao.
-- Melhor parar aqui e olhar.
do $$
begin
  if exists (
    select 1
      from public.pertences_deixados d
      join public.agendamentos a on a.id = d.agendamento_id
     where a.tipo not in ('creche', 'hotel')
  ) then
    raise exception 'Ha pertences em agendamentos que nao sao Creche/Hotel. Revise antes de migrar.';
  end if;
end $$;

-- Cada agendamento vira uma lista de UM servico, levando o valor do plano.
insert into public.agendamento_servicos (agendamento_id, servico, valor)
select a.id,
       a.tipo::text::public.servico_agendamento,
       case when a.tipo = 'visita' then null else p.valor_total end
  from public.agendamentos a
  left join public.planos_estadia p on p.agendamento_id = a.id;

-- Hotel e Banho so tinham plano para guardar o valor, que acabou de mudar
-- de lugar. O plano (rotina diaria) passa a ser exclusivo da Creche.
delete from public.planos_estadia p
 using public.agendamentos a
 where a.id = p.agendamento_id
   and a.tipo <> 'creche';

-- Leva junto a `chk_valor_nao_negativo` de `planos_estadia`.
alter table public.planos_estadia drop column valor_total;


-- ── 3. Regras de combinacao ───────────────────────────────────────────────
--
-- CONSTRAINT TRIGGER adiado: a checagem roda no COMMIT, olhando o
-- agendamento inteiro ja gravado. Imediato, ele veria estados intermediarios
-- — o agendamento recem-inserido ainda sem servicos, ou a lista apagada
-- antes de ser regravada na edicao — e recusaria gravacoes validas.
--
-- Substitui o `impedir_estadia_em_visita`, que perguntava pelo tipo.

drop trigger if exists trg_plano_nao_visita on public.planos_estadia;
drop trigger if exists trg_pertences_nao_visita on public.pertences_deixados;
drop function if exists public.impedir_estadia_em_visita();

create or replace function public.validar_servicos_agendamento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_id       uuid;
  v_servicos servico_agendamento[];
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

  -- Agendamento apagado (cascade): nao ha o que validar.
  if not exists (select 1 from agendamentos where id = v_id) then
    return null;
  end if;

  select coalesce(array_agg(servico), '{}')
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

create constraint trigger trg_validar_servicos
  after insert or update or delete on public.agendamento_servicos
  deferrable initially deferred
  for each row execute function public.validar_servicos_agendamento();

-- Pega o agendamento criado sem nenhum servico.
create constraint trigger trg_validar_servicos_agendamento
  after insert on public.agendamentos
  deferrable initially deferred
  for each row execute function public.validar_servicos_agendamento();

create constraint trigger trg_validar_servicos_plano
  after insert or update on public.planos_estadia
  deferrable initially deferred
  for each row execute function public.validar_servicos_agendamento();

create constraint trigger trg_validar_servicos_pertences
  after insert or update on public.pertences_deixados
  deferrable initially deferred
  for each row execute function public.validar_servicos_agendamento();


-- ── 4. Funcoes de gravacao ────────────────────────────────────────────────
--
-- As assinaturas mudam (`p_tipo` sai, `p_servicos` entra), entao as antigas
-- sao removidas — senao ficariam como sobrecarga e o PostgREST poderia
-- escolher a errada.

drop function if exists public.criar_agendamento(
  uuid[], tipo_agendamento, timestamptz, timestamptz, status_agendamento,
  text, jsonb, jsonb
);
drop function if exists public.atualizar_agendamento(
  uuid, uuid[], tipo_agendamento, timestamptz, timestamptz,
  status_agendamento, text, jsonb, jsonb
);
drop function if exists public.gerar_ocorrencias_recorrencia(
  uuid[], timestamptz, timestamptz, int[], status_agendamento, text, jsonb, jsonb
);

-- `p_servicos`: [{"servico": "creche", "valor": 80}, {"servico": "banho", "valor": null}]
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

  insert into agendamento_servicos (agendamento_id, servico, valor)
  select p_id,
         (s ->> 'servico')::servico_agendamento,
         nullif(s ->> 'valor', '')::numeric
    from jsonb_array_elements(coalesce(p_servicos, '[]'::jsonb)) s;
end $$;

-- Igual a versao do script 06, sem `valor_total` no plano.
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
      horario_saida, forma_pagamento
    )
    values (
      p_id,
      nullif(p_plano ->> 'tipo_plano', '')::tipo_plano,
      nullif(p_plano ->> 'total_dias', '')::int,
      nullif(p_plano ->> 'horario_entrada', '')::time,
      nullif(p_plano ->> 'horario_saida', '')::time,
      nullif(p_plano ->> 'forma_pagamento', '')::forma_pagamento
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
    data_hora_inicio, data_hora_fim, status, recorrente,
    dias_semana_recorrencia, observacoes
  )
  values (
    p_data_hora_inicio, p_data_hora_fim, p_status, false,
    null, p_observacoes
  )
  returning id into v_id;

  -- Se a constraint de sobreposicao barrar aqui, o insert acima e desfeito.
  insert into agendamento_animais (
    agendamento_id, animal_id, data_hora_inicio, data_hora_fim, status
  )
  select v_id, a, p_data_hora_inicio, p_data_hora_fim, p_status
  from unnest(p_animal_ids) a;

  perform public.gravar_servicos_agendamento(v_id, p_servicos);
  perform public.gravar_relacionados_agendamento(v_id, p_plano, p_pertences);

  return v_id;
end $$;


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

  -- Principais (Creche, Hotel, Visita) nao mudam: definem horario, plano,
  -- pertences e a serie. Extras entram e saem livremente.
  select coalesce(string_agg(servico::text, ',' order by servico), '')
    into v_antes
    from agendamento_servicos
   where agendamento_id = p_id
     and servico in ('creche', 'hotel', 'visita');

  select coalesce(string_agg(s ->> 'servico', ','
                    order by (s ->> 'servico')::servico_agendamento), '')
    into v_depois
    from jsonb_array_elements(coalesce(p_servicos, '[]'::jsonb)) s
   where s ->> 'servico' in ('creche', 'hotel', 'visita');

  if v_antes <> v_depois then
    raise exception using
      errcode = 'check_violation',
      message = 'Creche, Hotel e Visita não podem ser alterados depois de criado o agendamento. Cancele este e crie outro.',
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


-- Mesma regra do script 02 (fuso, uma linha por dia marcado, serie
-- compartilhada); muda so a origem do "tipo" e do valor.
create or replace function public.gerar_ocorrencias_recorrencia(
  p_animal_ids   uuid[],
  p_servicos     jsonb,
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
security invoker
set search_path = public
as $$
declare
  -- Fuso do negocio. Os horarios do plano de estadia sao "hora de parede"
  -- da creche, nao instantes em UTC.
  v_fuso constant text := 'America/Sao_Paulo';

  v_serie_id       uuid := gen_random_uuid();
  v_ids            uuid[] := '{}';
  v_dia            date;
  v_novo_id        uuid;
  v_hora_entrada   time;
  v_hora_saida     time;
  v_data_inicial   date;
  v_data_final     date;
  v_inicio         timestamptz;
  v_fim            timestamptz;
begin
  if p_animal_ids is null or array_length(p_animal_ids, 1) is null then
    raise exception 'Selecione ao menos um animal.';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(coalesce(p_servicos, '[]'::jsonb)) s
     where s ->> 'servico' = 'creche'
  ) then
    raise exception using
      errcode = 'check_violation',
      message = 'Recorrência só é permitida para agendamentos com Creche.',
      hint    = 'mensagem_para_usuario';
  end if;

  if p_dias_semana is null or array_length(p_dias_semana, 1) is null then
    raise exception 'Informe ao menos um dia da semana para a recorrencia.';
  end if;

  if p_data_fim is null or p_data_fim < p_data_inicio then
    raise exception 'Periodo invalido: a data final deve ser posterior a inicial.';
  end if;

  -- Limites do periodo no fuso do negocio (e nao no do servidor).
  v_data_inicial := (p_data_inicio at time zone v_fuso)::date;
  v_data_final   := (p_data_fim    at time zone v_fuso)::date;

  -- Horarios vindos do plano de estadia; se ausentes, usa o horario do inicio.
  v_hora_entrada := coalesce(
    nullif(p_plano ->> 'horario_entrada', '')::time,
    (p_data_inicio at time zone v_fuso)::time
  );
  v_hora_saida := nullif(p_plano ->> 'horario_saida', '')::time;

  for v_dia in
    select d::date
    from generate_series(v_data_inicial, v_data_final, interval '1 day') d
    where extract(dow from d)::int = any(p_dias_semana)
  loop
    v_inicio := (v_dia + v_hora_entrada) at time zone v_fuso;
    v_fim := case
               when v_hora_saida is null then null
               else (v_dia + v_hora_saida) at time zone v_fuso
             end;

    insert into agendamentos (
      data_hora_inicio, data_hora_fim, status,
      recorrente, dias_semana_recorrencia, agendamento_recorrencia_id,
      observacoes
    )
    values (
      v_inicio, v_fim, p_status,
      false,            -- a ocorrencia e o resultado da regra, nao a regra
      null,
      v_serie_id,
      p_observacoes
    )
    returning id into v_novo_id;

    v_ids := v_ids || v_novo_id;

    -- Vinculo com os animais. Periodo e status sao espelhados aqui porque e
    -- sobre estas colunas que `excl_animal_sem_sobreposicao_juncao` age.
    insert into agendamento_animais (
      agendamento_id, animal_id, data_hora_inicio, data_hora_fim, status
    )
    select v_novo_id, a, v_inicio, v_fim, p_status
    from unnest(p_animal_ids) a;

    -- Servicos, plano e pertences sao COPIADOS em cada ocorrencia. Por isso
    -- o valor de cada servico e o do DIA — senao `sum(valor)` devolveria o
    -- pacote multiplicado pelo numero de dias.
    perform public.gravar_servicos_agendamento(v_novo_id, p_servicos);
    perform public.gravar_relacionados_agendamento(v_novo_id, p_plano, p_pertences);
  end loop;

  return v_ids;
end $$;


-- Toda funcao em `public` vira endpoint do PostgREST (ver script 07): so
-- `authenticated` executa. As auxiliares tambem precisam do grant, porque
-- as RPCs sao SECURITY INVOKER e as chamam com os privilegios de quem chamou.
revoke all on function public.gravar_servicos_agendamento(uuid, jsonb)
  from public, anon;
grant execute on function public.gravar_servicos_agendamento(uuid, jsonb)
  to authenticated;

revoke all on function public.criar_agendamento(
  uuid[], jsonb, timestamptz, timestamptz, status_agendamento, text, jsonb, jsonb
) from public, anon;
grant execute on function public.criar_agendamento(
  uuid[], jsonb, timestamptz, timestamptz, status_agendamento, text, jsonb, jsonb
) to authenticated;

revoke all on function public.atualizar_agendamento(
  uuid, uuid[], jsonb, timestamptz, timestamptz, status_agendamento, text,
  jsonb, jsonb
) from public, anon;
grant execute on function public.atualizar_agendamento(
  uuid, uuid[], jsonb, timestamptz, timestamptz, status_agendamento, text,
  jsonb, jsonb
) to authenticated;

revoke all on function public.gerar_ocorrencias_recorrencia(
  uuid[], jsonb, timestamptz, timestamptz, int[], status_agendamento, text,
  jsonb, jsonb
) from public, anon;
grant execute on function public.gerar_ocorrencias_recorrencia(
  uuid[], jsonb, timestamptz, timestamptz, int[], status_agendamento, text,
  jsonb, jsonb
) to authenticated;


-- ── 5. Sincronizacao com o Google ─────────────────────────────────────────
--
-- `tipo` sai da lista de colunas do gatilho (a coluna vai deixar de existir).
--
-- NAO ha trigger de sync em `agendamento_servicos`, de proposito: todo
-- caminho que grava servicos (as tres RPCs acima) tambem regrava
-- `agendamento_animais`, cujo trigger ja sincroniza. Um trigger aqui dobraria
-- as chamadas na criacao — e duas chamadas simultaneas para um agendamento
-- ainda sem evento podem criar o evento duas vezes no Google.

drop trigger if exists trg_sync_agenda on public.agendamentos;

create trigger trg_sync_agenda
  after update of data_hora_inicio, data_hora_fim, status, observacoes
  on public.agendamentos
  for each row
  execute function public.disparar_sync_agenda();


-- ── 6. Remocao do tipo ────────────────────────────────────────────────────

-- Recorrencia so com Creche agora e checada na RPC de recorrencia (a regra
-- envolve outra tabela, o que um CHECK nao alcanca). Na pratica a
-- constraint nunca agia: toda linha gravada e ocorrencia, com
-- `recorrente = false`.
alter table public.agendamentos drop constraint if exists chk_recorrencia_so_creche;

alter table public.agendamentos drop column tipo;

-- Falha se ainda houver algo dependendo do tipo — e e isso que queremos.
drop type public.tipo_agendamento;

commit;


-- ---------------------------------------------------------------------------
-- Conferencia (rode depois):
--
--   select s.servico, count(*), count(s.valor) as com_valor
--     from agendamento_servicos s group by 1 order by 1;
--
--   -- agendamentos sem servico (deve voltar vazio)
--   select a.id from agendamentos a
--    where not exists (select 1 from agendamento_servicos s
--                       where s.agendamento_id = a.id);
-- ---------------------------------------------------------------------------
