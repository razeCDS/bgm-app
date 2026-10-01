-- ---------------------------------------------------------------------------
-- BGM Daycare — regras de negocio no banco
--
-- Ate aqui as regras viviam apenas no app (TypeScript). Qualquer cliente
-- falando direto com o PostgREST conseguiria gravar dados que as violam.
-- Estas constraints valem para qualquer caminho de escrita — inclusive a RPC
-- de recorrencia e futuras Edge Functions.
--
-- A validacao do formulario continua existindo: ela da a mensagem amigavel.
-- Isto aqui e a rede de seguranca por baixo.
--
-- Aplicado via migracao `regras_de_negocio_no_banco`.
-- ---------------------------------------------------------------------------

-- ── Grupo A — regras de uma linha so, em `agendamentos` ────────────────────

alter table public.agendamentos
  add constraint chk_periodo_coerente
    check (data_hora_fim is null or data_hora_fim >= data_hora_inicio),

  add constraint chk_recorrencia_so_creche
    check (not recorrente or tipo = 'creche'),

  add constraint chk_recorrencia_tem_dias
    check (not recorrente
           or coalesce(array_length(dias_semana_recorrencia, 1), 0) >= 1),

  add constraint chk_recorrencia_tem_fim
    check (not recorrente or data_hora_fim is not null),

  -- 0 = domingo .. 6 = sabado (convencao do `extract(dow)`)
  add constraint chk_dias_semana_validos
    check (dias_semana_recorrencia is null
           or dias_semana_recorrencia <@ array[0,1,2,3,4,5,6]),

  -- Uma ocorrencia gerada e resultado da regra, nunca a propria regra.
  add constraint chk_ocorrencia_nao_e_regra
    check (agendamento_recorrencia_id is null or not recorrente);


-- ── Grupo B — Visita nao tem estadia (entre tabelas, exige trigger) ────────

create or replace function public.impedir_estadia_em_visita()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo tipo_agendamento;
begin
  select tipo into v_tipo
  from agendamentos
  where id = new.agendamento_id;

  if v_tipo = 'visita' then
    raise exception 'Agendamento do tipo Visita nao possui %.', tg_table_name
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists trg_plano_nao_visita on public.planos_estadia;
create trigger trg_plano_nao_visita
  before insert or update on public.planos_estadia
  for each row execute function public.impedir_estadia_em_visita();

drop trigger if exists trg_pertences_nao_visita on public.pertences_deixados;
create trigger trg_pertences_nao_visita
  before insert or update on public.pertences_deixados
  for each row execute function public.impedir_estadia_em_visita();


-- ── Grupo D — qualidade de dado ───────────────────────────────────────────

alter table public.planos_estadia
  add constraint chk_valor_nao_negativo
    check (valor_total is null or valor_total >= 0),
  add constraint chk_total_dias_positivo
    check (total_dias is null or total_dias > 0);

alter table public.contatos_emergencia
  add constraint chk_ordem_positiva
    check (ordem is null or ordem > 0);

-- `idade` e text no banco, mas o app trata como numero. Barra "dois anos".
alter table public.animais
  add constraint chk_idade_numerica
    check (idade is null or idade ~ '^[0-9]{1,3}$');

-- Alinha o banco ao formulario, que ja exige CPF/CNPJ.
alter table public.tutores
  alter column cpf_cnpj set not null;


-- ── Grupo E — o mesmo cao nao pode estar em dois lugares ao mesmo tempo ────

create extension if not exists btree_gist;

-- Somar horas/minutos a timestamptz e deterministico (tempo absoluto), entao
-- marcar IMMUTABLE e honesto. O mesmo NAO valeria para dias/meses, que
-- dependem de fuso por causa do horario de verao.
--
-- (Sem esta funcao o EXCLUDE nem e criado: expressoes de indice exigem
-- IMMUTABLE, e `timestamptz + interval` e apenas STABLE.)
create or replace function public.periodo_agendamento(
  p_inicio timestamptz,
  p_fim    timestamptz
) returns tstzrange
language sql immutable
as $$
  select tstzrange(
    p_inicio,
    greatest(
      coalesce(p_fim, p_inicio + interval '1 hour'),
      -- Sem isso, um agendamento com fim = inicio geraria range vazio,
      -- que nao colide com nada e escaparia da protecao.
      p_inicio + interval '1 minute'
    )
  );
$$;

comment on function public.periodo_agendamento is
  'Intervalo ocupado por um agendamento. Fim nulo assume 1h; nunca vazio.';

alter table public.agendamentos
  add constraint excl_animal_sem_sobreposicao
  exclude using gist (
    animal_id with =,
    periodo_agendamento(data_hora_inicio, data_hora_fim) with &&
  ) where (status <> 'cancelado');

comment on constraint excl_animal_sem_sobreposicao on public.agendamentos is
  'Impede dupla reserva do mesmo animal. Cancelados ficam de fora.';
