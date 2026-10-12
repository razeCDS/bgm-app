-- ---------------------------------------------------------------------------
-- BGM Daycare — fim do status "confirmado"
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- A equipe nao usa o passo "confirmado": o agendamento vai de solicitado
-- direto para em andamento. O app deixou de oferecer o status; aqui o banco
-- passa a recusa-lo, para que nenhum outro caminho de escrita o grave.
--
-- POR QUE UM CHECK, E NAO TIRAR O VALOR DO ENUM
--
-- O Postgres nao remove valor de enum. Seria preciso recriar o tipo, e com
-- ele as RPCs que o recebem (`criar_agendamento`, `atualizar_agendamento`,
-- `gerar_ocorrencias_recorrencia`) e a exclusao de sobreposicao, que o cita
-- no WHERE. O CHECK tem o mesmo efeito sem mexer em nada disso.
--
-- So o `agendamentos` precisa do CHECK: o status de `agendamento_animais` e
-- espelho dele (trigger `trg_sincronizar_animais`).
--
-- Rode inteiro, de uma vez (esta numa transacao), DEPOIS de publicar a
-- versao do app sem o status — antes disso, salvar um agendamento como
-- "Confirmado" no app antigo daria erro.
-- ---------------------------------------------------------------------------

begin;

-- Quem ainda estiver confirmado volta a solicitado, o passo anterior. Em
-- out/2026 nao havia nenhum; fica para o caso de alguem marcar ate o deploy.
update public.agendamentos
   set status = 'solicitado'
 where status = 'confirmado';

alter table public.agendamentos
  add constraint chk_status_sem_confirmado
  check (status <> 'confirmado');

comment on type public.status_agendamento is
  'O valor confirmado esta fora de uso (chk_status_sem_confirmado, script 10).';

commit;
