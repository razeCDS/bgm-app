# BGM Daycare

Gestão interna do BGM Daycare (creche e hotel para cães).

| Pasta | O que é |
|---|---|
| [`web/`](web/) | O app: Next.js, instalável no celular como PWA. Como rodar está no [README dele](web/README.md). |
| [`supabase/`](supabase/) | O backend: scripts SQL do banco e a Edge Function que espelha a agenda no Google. |

O primeiro app foi feito em Expo (React Native), na pasta `mobile/`. O web o
substituiu, e o `mobile/` saiu do repositório — continua no histórico do git.

## Backend (Supabase)

### Scripts SQL

Rodados no SQL Editor do painel, nesta ordem. Cada um explica no cabeçalho o
problema que resolve.

| Script | O que faz |
|---|---|
| `01_rls_policies.sql` | Liga o RLS: quem está autenticado tem acesso total; `anon` não lê nada |
| `02_fn_gerar_ocorrencias.sql` | RPC que gera uma linha por ocorrência da creche recorrente |
| `03_google_calendar.sql` | Trigger que chama a Edge Function de sync (pré-requisitos no cabeçalho) |
| `04_regras_negocio.sql` | Regras de negócio como constraints: valem para qualquer caminho de escrita |
| `05_agendamento_varios_animais.sql` | Um agendamento passa a atender vários cães (tabela de junção) |
| `06_rpc_agendamento_atomico.sql` | Criar/editar agendamento numa transação só — sem registros órfãos |
| `07_revoke_enfileirar_sync.sql` | Fecha a RPC pública que disparava o sync |
| `08_servicos_agendamento.sql` | Troca o tipo único do agendamento por uma lista de serviços, cada um com seu valor |
| `09_servicos_por_dia.sql` | Extras do Hotel num dia específico da estadia |

### Edge Function `sincronizar-agenda`

Espelha cada agendamento como evento no Google Agenda, via service account.
Secrets cadastrados no painel (nunca no código): `GOOGLE_SERVICE_ACCOUNT` e
`GOOGLE_CALENDAR_ID`. A `service_role` usada pelo trigger fica no Vault do
Supabase.

Falha de sync nunca invalida o agendamento: o erro vai para
`agendamentos.google_sync_erro` e aparece como aviso na lista do app.

### Usuários

Não há cadastro público: as contas são criadas à mão no painel
(Authentication → Users). Com o RLS atual, qualquer conta autenticada vê
todos os dados — por isso o cadastro público precisa ficar desligado.

## Regras de negócio

- **Tutor é o principal**: é ele quem reserva. Um agendamento pode atender
  vários cães, todos do mesmo tutor.
- **Serviços**: cada agendamento tem um ou mais, cada um com seu valor
  (livre e opcional — não há tabela de preços).
  - **Principais** — definem a estrutura do agendamento:
    - **Creche (período integral)** — só a data; os horários vêm do plano de
      estadia (rotina diária: entrada e saída obrigatórias, tipo de plano,
      forma de pagamento). Tem pertences e é a única com recorrência.
    - **Hotel** — o período do agendamento é a própria estadia; tem
      pertences, sem plano.
    - **Visita** — sempre sozinha, sem valor, plano nem pertences.
  - **Extras** — **Banho**, **Tosa higiênica** e **Consulta**: sozinhos (só
    período e valor) ou somados a Creche/Hotel.
  - Creche e Hotel não podem ser marcados juntos.
- **Extras num dia da hospedagem** (só Hotel): o formulário lista os dias
  da estadia e cada extra pode ser marcado num dia específico (o banho do
  dia 20), inclusive em mais de um dia. Sem dia, vale para a estadia toda.
  O dia precisa estar dentro da estadia. No Google, o evento continua um só
  e a descrição lista os serviços com os dias.
- **Valores**: com Creche, cada valor é **por dia** (a série copia os
  serviços em cada ocorrência); no Hotel, é o da estadia inteira. A lista
  mostra a soma.
- **Principais não mudam depois de criado**: cada um guarda dados
  diferentes. Para trocar, cancela-se e cria-se outro. Extras entram e saem
  na edição.
- **Recorrência** (Creche): informada em semanas + dias da semana. Gera uma
  linha por ocorrência, com os mesmos serviços em todas; todas compartilham
  `agendamento_recorrencia_id`, então dá para cancelar um dia (ou incluir um
  banho nele) sem afetar os outros — ou cancelar a série inteira, o que
  cancela só as ocorrências futuras (as passadas são registro de frequência).
- **Cancelar** muda o status para `cancelado`; o registro nunca é apagado. No
  Google Agenda, o evento é removido.
- **Um cão não pode ter dois agendamentos no mesmo período** — barrado no
  banco por constraint, com mensagem amigável no app.
- **Termo de consentimento** é informativo: seus itens são conferência manual
  da equipe e nunca bloqueiam um agendamento.
- **Dias da semana** seguem a convenção do Postgres (`0` = domingo), que
  coincide com `Date.getDay()` do JavaScript.
- **CPF/CNPJ** do tutor é obrigatório — no formulário e no banco (`NOT NULL`).
