-- ---------------------------------------------------------------------------
-- BGM Daycare — um agendamento passa a atender VARIOS animais
--
-- Motivo: o tutor e quem reserva, e pode trazer mais de um cao no mesmo
-- periodo. O vinculo deixa de ser `agendamentos.animal_id` e passa para a
-- tabela de juncao `agendamento_animais`.
--
-- A PECA DELICADA
--
-- A protecao contra dupla reserva era:
--
--   EXCLUDE USING gist (animal_id WITH =, periodo_agendamento(...) WITH &&)
--
-- `EXCLUDE` nao atravessa tabelas: ela exige animal e periodo na MESMA linha.
-- Por isso a juncao carrega `data_hora_inicio`, `data_hora_fim` e `status`
-- espelhados do pai. A redundancia e deliberada — e o que mantem a garantia
-- viva. Um trigger em `agendamentos` mantem o espelho em dia; sem ele a
-- constraint julgaria dados velhos e barraria agendamentos legitimos.
--
-- Ja aplicado via migracao. Este arquivo e a versao versionada do que roda
-- no banco.
-- ---------------------------------------------------------------------------

create table if not exists public.agendamento_animais (
  agendamento_id   uuid not null references public.agendamentos(id) on delete cascade,
  animal_id        uuid not null references public.animais(id),
  data_hora_inicio timestamptz not null,
  data_hora_fim    timestamptz,
  status           status_agendamento not null,
  primary key (agendamento_id, animal_id)
);

alter table public.agendamento_animais
  drop constraint if exists excl_animal_sem_sobreposicao_juncao;

alter table public.agendamento_animais
  add constraint excl_animal_sem_sobreposicao_juncao
  exclude using gist (
    animal_id with =,
    periodo_agendamento(data_hora_inicio, data_hora_fim) with &&
  ) where (status <> 'cancelado');

create index if not exists idx_agendamento_animais_animal
  on public.agendamento_animais (animal_id);


-- Espelho do periodo/status do pai na juncao.
create or replace function public.sincronizar_animais_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update agendamento_animais
     set data_hora_inicio = new.data_hora_inicio,
         data_hora_fim    = new.data_hora_fim,
         status           = new.status
   where agendamento_id = new.id;
  return new;
end $$;

drop trigger if exists trg_sincronizar_animais on public.agendamentos;

create trigger trg_sincronizar_animais
  after update of data_hora_inicio, data_hora_fim, status
  on public.agendamentos
  for each row
  execute function public.sincronizar_animais_agendamento();


alter table public.agendamento_animais enable row level security;

drop policy if exists agendamento_animais_tudo on public.agendamento_animais;
create policy agendamento_animais_tudo on public.agendamento_animais
  for all to authenticated using (true) with check (true);


-- ---------------------------------------------------------------------------
-- Migracao do vinculo antigo e remocao da coluna
--
-- CUIDADO: `drop column animal_id` e irreversivel. Rode o insert antes.
-- ---------------------------------------------------------------------------

-- insert into public.agendamento_animais (
--   agendamento_id, animal_id, data_hora_inicio, data_hora_fim, status
-- )
-- select id, animal_id, data_hora_inicio, data_hora_fim, status
-- from public.agendamentos
-- where animal_id is not null
-- on conflict do nothing;
--
-- alter table public.agendamentos drop constraint if exists excl_animal_sem_sobreposicao;
-- alter table public.agendamentos drop column if exists animal_id;


-- ---------------------------------------------------------------------------
-- Sincronizacao com o Google Agenda
--
-- O envio foi extraido para `enfileirar_sync_agenda` porque agora existem
-- DOIS gatilhos: mudanca no agendamento e troca de caes. Duplicar o corpo
-- seria garantir que as duas copias divergissem.
-- ---------------------------------------------------------------------------

create or replace function public.enfileirar_sync_agenda(p_agendamento_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_url text;
  v_key text;
  v_registro jsonb;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'supabase_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_key';

  if v_url is null or v_key is null then
    raise warning 'sync agenda ignorado: segredos ausentes no Vault';
    return;
  end if;

  select to_jsonb(a) into v_registro from agendamentos a where a.id = p_agendamento_id;
  if v_registro is null then
    return;
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/sincronizar-agenda',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := jsonb_build_object(
                 'type',   'UPDATE',
                 'table',  'agendamentos',
                 'record', v_registro
               )
  );
end $$;

create or replace function public.disparar_sync_agenda()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
begin
  perform public.enfileirar_sync_agenda(new.id);
  return new;
end $$;

create or replace function public.disparar_sync_por_animais()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
begin
  perform public.enfileirar_sync_agenda(
    coalesce(new.agendamento_id, old.agendamento_id)
  );
  return null;
end $$;

drop trigger if exists trg_sync_agenda on public.agendamentos;

-- As colunas google_* seguem FORA da lista de proposito: a Edge Function
-- grava nelas, e inclui-las seria laco infinito.
create trigger trg_sync_agenda
  after insert or update of
    tipo, data_hora_inicio, data_hora_fim, status, observacoes
  on public.agendamentos
  for each row
  execute function public.disparar_sync_agenda();

drop trigger if exists trg_sync_agenda_animais on public.agendamento_animais;

create trigger trg_sync_agenda_animais
  after insert or delete on public.agendamento_animais
  for each row
  execute function public.disparar_sync_por_animais();
