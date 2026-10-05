# BGM Daycare — contexto completo do projeto

> **Para quem está lendo (outro chat/assistente):** este documento resume tudo o
> que já foi construído e decidido até **04/10/2026**. Trate-o como ponto de
> partida, mas confira o estado real dos arquivos e do banco antes de afirmar
> algo — o projeto continua evoluindo. Repositório:
> `C:\GIT\GITHUB\bgm\bgm-app` (GitHub: `razeCDS/bgm-app`, branch de trabalho
> `develop`; `main` é a padrão).

---

## 1. O que é

App **interno** de gestão do **BGM Daycare**, uma creche e hotel para cães. Quem
usa: as duas donas e a equipe (poucas pessoas, todas com conta criada à mão).
Não é voltado para clientes finais.

Módulos:
- **BGM Estadias** — o único implementado: cadastro de clientes (tutor + cães +
  ficha completa) e agendamentos (Creche, Hotel, Visita, Banho).
- **BGM Banho/Tosa** — card "em breve" na tela inicial; não existe ainda.

A agenda por data **não existe dentro do app**: cada agendamento é espelhado
automaticamente no **Google Agenda**, que é a visão de calendário da equipe.

## 2. Estado atual

- **App web em Next.js (PWA)** em `web/`, funcionando e **testado com o banco
  real e o Google Agenda** pelo usuário. Ainda **não foi publicado** (falta o
  deploy na Vercel).
- O app anterior em **Expo/React Native** (`mobile/`) foi **removido** do
  repositório depois da validação do web (continua no histórico do git).
- Últimos commits em `develop` (já enviados ao GitHub):

  | Commit | Conteúdo |
  |---|---|
  | `11ca445` | `.gitignore` da raiz limpo (era o modelo do Flutter) |
  | `e42cd22` | Remoção do `mobile/`; `supabase/` movido para a raiz; README da raiz |
  | `ac71784` | App web em Next.js (PWA) |
  | `fea2c9b` | Script 07: revoke de `enfileirar_sync_agenda` |

- **04/10/2026:** o tipo único do agendamento foi trocado por uma **lista de
  serviços**, e os extras do Hotel podem ter um dia específico (seção 8). Os
  scripts `08` e `09` foram aplicados pelo usuário no SQL Editor (por isso
  **não** aparecem na lista de migrations do MCP) e a Edge Function
  `sincronizar-agenda` está na **v9**, igual ao repositório.
- Verificação no momento: ESLint sem erros, `tsc` limpo, **59 testes**
  passando, build de produção ok.

## 3. Stack

| Camada | Tecnologia |
|---|---|
| App | Next.js **16.3.8** (App Router, Turbopack), React 19.2, TypeScript strict |
| Estilo | Tailwind CSS **v4** (tema em `globals.css`, sem `tailwind.config`) |
| Estado de servidor | TanStack Query 5 |
| Estado de UI | Zustand 5 |
| Datas | date-fns 4 (locale pt-BR) |
| Backend | Supabase: Postgres 17, PostgREST, Auth, Edge Functions (Deno), `pg_net`, Vault |
| Auth no Next | `@supabase/ssr` 0.12 (sessão em cookie) |
| Testes | Vitest 5 (import explícito, sem `globals`) |
| Integração | Google Calendar API via **service account** (sem OAuth de usuário) |
| Hospedagem (planejada) | Vercel, Root Directory = `web` |
| Ambiente local | Windows 11, Node 22, npm |

Supabase: projeto **"BGM's"**, ref `vatbekoevgazckbgiupt`, região `sa-east-1`,
plano gratuito.

## 4. Estrutura do repositório

```
bgm-app/
  README.md            visão geral, scripts SQL, regras de negócio
  CONTEXTO.md          este documento
  .mcp.json            MCP do Supabase para o Claude Code
  supabase/
    01..07_*.sql       scripts do banco (rodados no SQL Editor, em ordem)
    functions/sincronizar-agenda/index.ts   Edge Function (arquivo único)
  web/
    README.md          como rodar, estrutura, decisões
    scripts/           dev-demo.mjs, gerar-icones.mjs, icone.svg
    public/            ícones do PWA (icone-192/512.png)
    src/
      proxy.ts         roda antes de cada página (antigo "middleware")
      app/             rotas — arquivos finos que só montam a tela
        layout.tsx, providers.tsx, globals.css, manifest.ts, icon.png, apple-icon.png
        login/page.tsx
        (app)/         grupo de rotas logadas (layout com GuardSessao)
          page.tsx                         tela inicial (módulos)
          estadias/page.tsx                redireciona p/ /estadias/agendamentos
          estadias/(abas)/layout.tsx       cabeçalho + abas
          estadias/(abas)/agendamentos/    lista de agendamentos
          estadias/(abas)/clientes/        lista de cães
          estadias/agendamento/novo|[id]/  formulário de agendamento
          estadias/animal/novo|[id]|[id]/editar/   ficha e formulário de cliente
      components/      botoes, campos, cabecalho, chips, dialogo, janela, estados, spinner
      features/
        auth/          repositorio.ts (fake + Supabase), store.ts (Zustand), components/
        inicio/        tela-modulos.tsx
        estadias/
          types/       enums.ts, modelos.ts, entrada-agendamento.ts (regras puras)
          data/        repositorio.ts (interface), -fake.ts, -supabase.ts, mapeadores.ts
          hooks/       index.ts (queries, mutations, chaves de cache, stores de UI)
          components/  telas do módulo
          __tests__/   regras.test.ts
      lib/             supabase.ts, repositorios.ts, formatadores.ts, datas-input.ts,
                       navegacao.ts, erros.ts, __tests__/
```

## 5. Arquitetura do app web

### 5.1 Camadas

```
types/ (regras puras, testadas)  →  data/ (repositórios)  →  hooks/ (TanStack/Zustand)  →  components/ (telas)
```

- **Regras de negócio puras** em `types/entrada-agendamento.ts`:
  `validarAgendamento`, `erroMudancaServicos`, `gerarOcorrencias`,
  `fimDaJanela`, `comHorario`, `periodoOcupado`, `ErroValidacao`. As regras
  por serviço ficam em `types/enums.ts` (`erroCombinacao`,
  `servicoIncompativel`, `exigePlanoEstadia`, `temPertences`,
  `permiteRecorrencia`, `ePrincipal`) e recebem a **lista** de serviços. Sem
  dependência de React nem de rede.
- **Padrão repositório**: a interface `EstadiasRepositorio` tem duas
  implementações intercambiáveis — `RepositorioFake` (memória, com dados de
  exemplo) e `RepositorioSupabase`. Métodos: `listarTutores`, `salvarTutor`,
  `listarAnimais`, `obterFicha`, `salvarAnimal`, `salvarFicha`,
  `listarAgendamentos`, `obterAgendamento`, `listarOcorrencias`,
  `criarAgendamento`, `atualizarAgendamento`, `cancelarAgendamento`,
  `cancelarSerie`. Auth tem o mesmo esquema (`AuthFake` / `AuthSupabase`).
- **Ponto único de chaveamento**: `lib/repositorios.ts`. Se as variáveis
  `NEXT_PUBLIC_SUPABASE_*` existem → Supabase; senão → memória. Nenhum outro
  arquivo instancia repositório.
- **Teste de contrato** (`lib/__tests__/repositorios.test.ts`) garante que as
  duas implementações têm exatamente os mesmos métodos — a divergência entre
  elas foi a classe de bug mais cara no passado.
- `data/mapeadores.ts` converte linhas do PostgREST (snake_case, sem tipos
  gerados — `type Linha = Record<string, any>`, contido aqui) em modelos
  tipados (camelCase).

### 5.2 Estado e cache

- `QueryClient` criado dentro de `useState` em `app/providers.tsx` (no
  servidor, um cliente de módulo seria compartilhado entre usuários).
  Padrões: `retry: 1`, `staleTime: 30_000`.
- Chaves: `['tutores']`, `['animais', busca]`, `['ficha', id]`,
  `['agendamentos', filtro]`, `['agendamento', id]`, `['serie', recorrenciaId]`.
- Mutações invalidam por prefixo (ex.: qualquer escrita em agendamento
  invalida `agendamentos`, `agendamento` e `serie`).
- Zustand guarda só estado de UI: texto da busca de clientes e filtros da
  lista de agendamentos (serviço, status, animal, tutor, período).
- Ao **Sair**, o cache do TanStack é limpo (aparelho pode ser compartilhado).

### 5.3 Autenticação

- `lib/supabase.ts` usa **`createBrowserClient`** (`@supabase/ssr`): a sessão
  fica num **cookie**, que viaja em toda requisição.
- `src/proxy.ts` (Next 16 renomeou `middleware` → `proxy`): renova o token
  com `getClaims()` (valida assinatura — nunca usar `getSession` no servidor),
  e redireciona: sem sessão → `/login`; com sessão em `/login` → `/`. Em modo
  memória não faz nada. Matcher exclui estáticos, ícones e o manifesto.
- `GuardSessao` (layout de `(app)`) cobre o que acontece com a página aberta:
  sair, token expirado, modo memória. **A tela de login não redireciona
  sozinha** quem parece logado — isso evita loop entre navegador e proxy.
- O store de sessão só assina `onAuthStateChange` no navegador
  (`typeof window !== 'undefined'`), para o HTML do servidor bater com o
  primeiro render (hidratação).
- Proxy é conveniência de navegação; **quem protege os dados é o RLS**.

### 5.4 Telas e componentes

- Rotas: `/login`, `/`, `/estadias/agendamentos`, `/estadias/clientes`,
  `/estadias/agendamento/novo`, `/estadias/agendamento/[id]`,
  `/estadias/animal/novo`, `/estadias/animal/[id]`,
  `/estadias/animal/[id]/editar`. Páginas com `[id]` recebem `params` como
  **Promise** (Next 16) e passam o id para o componente cliente.
- As abas Agendamentos/Clientes são **URLs** (voltar/recarregar mantêm a aba).
- Formulários (`form-agendamento.tsx`, `form-animal.tsx`): o componente
  externo carrega os dados e só então monta o `Formulario`, cujos `useState`
  recebem os valores iniciais via `valoresIniciais(...)` — **sem `useEffect`
  para preencher campos** (regra do lint do React).
- `components/campos.tsx`: `Campo` (prop `teclado`: numerico/decimal/telefone/
  email — números usam `type="text"` + `inputMode` por causa da vírgula
  decimal), `Seletor` (sobre `<select>` nativo, aceita `bloqueado`),
  `SeletorDataHora` (`date`/`datetime-local`), `SeletorHora` (`time`),
  `LinhaSwitch`, `Secao`, `Pilula`, `Rodape`. Inputs com 16px de fonte (o
  Safari do iPhone dá zoom abaixo disso).
- `lib/datas-input.ts`: conversão `Date` ↔ texto dos inputs **sempre no fuso
  local** via `parse` do date-fns (`new Date('2026-10-01')` seria UTC e
  "voltaria" um dia no Brasil). Testado.
- `components/dialogo.tsx`: `DialogoProvider` + `useDialogo()` →
  `avisar(titulo, msg)` e `confirmar({...}) → Promise<boolean>`, sobre
  `<dialog>` nativo. Substitui o `Alert.alert` do React Native.
- `lib/navegacao.ts`: `useVoltar(alternativa)` — volta no histórico só se já
  houve navegação dentro do app; senão vai para a rota alternativa (no PWA
  instalado não há botão voltar do navegador).
- Lista de agendamentos **agrupa séries** recorrentes num cartão só
  ("Próxima:"/"Última:", "N ocorrências · M a vir"), mostra aviso ⚠️ quando o
  sync com o Google falhou (`google_sync_erro`), um chip por serviço e a
  **soma** dos valores (com `/dia` quando tem Creche).
- O filtro "Serviço" traz os agendamentos que **contêm** o serviço. No
  Supabase isso usa um segundo embed só para filtrar
  (`filtro_servico:agendamento_servicos!inner`), senão o PostgREST cortaria
  os outros serviços do agendamento.
- Formulário: seção **Serviços** com checkboxes (`LinhaCheckbox`).
  Combinações inválidas ficam desabilitadas; na edição, os principais
  aparecem travados 🔒. Seção **Valores** com um campo por serviço (menos
  Visita) e o total.
- Botão ↻ no cabeçalho substitui o "puxar para atualizar"; o TanStack já
  recarrega ao voltar o foco para o app.

### 5.5 PWA

- `app/manifest.ts` (standalone, cores do app, ícones 192/512 + maskable).
- **Sem service worker, de propósito**: instalar não depende dele, e cache
  offline mostraria agenda desatualizada sem ninguém perceber.
- `viewport-fit=cover` + `env(safe-area-inset-*)` no cabeçalho, rodapés e
  botão flutuante (entalhe e barra de gestos do iPhone).
- Ícone: pata terracota sobre verde, desenhado em `scripts/icone.svg`.

### 5.6 Tema

Cores em `globals.css` (`@theme`): `primaria #46715C`, `primaria-escura
#35543F`, `primaria-clara #6B9280`, `acento #DCA899`, `neutra #ADB4AB`,
`neutra-clara #EDEFEC`, `texto-escuro #1F2B24`, `texto-suave #5F6B63`,
`erro #B3261E`; raio `campo` = 10px. Transparências via modificador
(`bg-primaria/12`). Nenhuma tela declara cor literal.

## 6. Banco de dados

### 6.1 Tabelas (`public`)

| Tabela | Colunas principais |
|---|---|
| `tutores` | id, **nome_completo**, **cpf_cnpj**, rg, telefone, email, endereco |
| `animais` | id, **tutor_id**, **nome**, raca, idade (`text`, só dígitos), porte, peso, especie, sexo, castrado, docil, observacoes |
| `veterinarios_info` | 1:1 com animal — nome, especialidade, telefones, clínica |
| `contatos_emergencia` | N por animal — nome, parentesco, telefone, ordem (>0) |
| `anamneses` | 1:1 com animal — doença/cuidados/medicação (+ "qual"), alergias, vermífugo e vacina (+ datas), observações |
| `termos_consentimento` | 1:1 com animal — aceito, data_aceite, local_aceite |
| `agendamentos` | id, **data_hora_inicio**, data_hora_fim, **status**, recorrente, dias_semana_recorrencia (`int[]`), agendamento_recorrencia_id, observacoes, google_calendar_event_id, google_sync_em, google_sync_erro |
| `agendamento_animais` | junção N:N — agendamento_id, animal_id + **espelho** de data_hora_inicio/fim e status |
| `agendamento_servicos` | 1:N com agendamento — **servico**, valor (livre, opcional), data (dia específico, só extras de Hotel); `UNIQUE NULLS NOT DISTINCT (agendamento_id, servico, data)` |
| `planos_estadia` | 1:1 com agendamento, **só com Creche** — tipo_plano, total_dias, horario_entrada/saida (`time`), forma_pagamento |
| `pertences_deixados` | 1:1 com agendamento — caminha/roupa/brinquedo (+ cor/qual), ração, quantidade, vezes, observações |

(Negrito = `NOT NULL`. Não há coluna `created_at` em `agendamentos`. A
coluna `tipo` e o `planos_estadia.valor_total` saíram com o script 08.)

### 6.2 Enums

`servico_agendamento` (creche, hotel, banho, tosa_higienica, consulta,
visita — substitui o antigo `tipo_agendamento`) · `status_agendamento`
(solicitado, confirmado, em_andamento, concluido, cancelado) · `tipo_plano`
(diaria, semanal, mensal, anual) · `forma_pagamento` (pix, dinheiro) ·
`porte_animal` (mini, pequeno, medio, grande) · `especie_animal` (canina,
felina) · `sexo_animal` (femea, macho).

### 6.3 Regras garantidas pelo banco

- `excl_animal_sem_sobreposicao_juncao` — **EXCLUDE USING gist** em
  `agendamento_animais`: o mesmo animal não pode ter dois agendamentos não
  cancelados com períodos sobrepostos. Usa `periodo_agendamento(inicio, fim)`
  (fim nulo = 1 hora; nunca vazio). Precisa de `btree_gist`.
  - Por que o espelho de datas/status na junção: EXCLUDE não atravessa
    tabelas. O trigger `trg_sincronizar_animais` mantém o espelho atualizado.
- CHECKs em `agendamentos`: período coerente (fim ≥ início), recorrência
  exige dias e data final, dias da semana em 0–6, e ocorrência (tem
  `agendamento_recorrencia_id`) não é marcada como regra. ("Recorrência só
  em Creche" saiu do CHECK e foi para a RPC de recorrência.)
- CHECKs: `valor ≥ 0` e Visita sem valor (em `agendamento_servicos`),
  `total_dias > 0`, `ordem > 0`, `idade` numérica.
- `validar_servicos_agendamento` — **constraint trigger adiado** (roda no
  COMMIT, olhando o agendamento inteiro): ao menos um serviço; Creche e Hotel
  se excluem; Visita sozinha; plano só com Creche; pertences só com Creche
  ou Hotel; dia específico só em extras de Hotel e dentro da estadia (no
  fuso de São Paulo; também roda quando as datas do agendamento mudam). Erros saem com `hint = 'mensagem_para_usuario'`, e o app exibe a
  mensagem como veio. Substitui o antigo `impedir_estadia_em_visita`.
- UNIQUE 1:1: anamnese, termo e veterinário por animal; plano e pertences por
  agendamento.

### 6.4 Funções (RPC)

| Função | Papel |
|---|---|
| `criar_agendamento(...)` / `atualizar_agendamento(...)` | Gravação **atômica** (agendamento + junção + serviços + plano + pertences numa transação). Recebem `p_animal_ids uuid[]`, `p_servicos jsonb` (`[{servico, valor}]`), `p_plano jsonb`, `p_pertences jsonb`. `atualizar` recusa troca de Creche/Hotel/Visita. |
| `gerar_ocorrencias_recorrencia(...)` | Creche recorrente: cria uma linha por dia marcado dentro da janela, copiando serviços, plano e pertences; todas com o mesmo `agendamento_recorrencia_id`. Exige Creche em `p_servicos`. Retorna os ids. |
| `gravar_servicos_agendamento(...)` / `gravar_relacionados_agendamento(...)` | Auxiliares internas (serviços; plano/pertences). |
| `enfileirar_sync_agenda(id)` | Enfileira a chamada HTTP para a Edge Function (via `pg_net`). **Sem EXECUTE para anon/authenticated** (script 07). |
| `periodo_agendamento(inicio, fim)` | `tstzrange` usado pela exclusão. |

Antes das RPCs atômicas o app gravava em 4 chamadas separadas e uma falha na
junção deixava agendamento **órfão** — por isso elas existem.

### 6.5 Triggers de sincronização com o Google

- `trg_sync_agenda` — `AFTER UPDATE OF data_hora_inicio, data_hora_fim,
  status, observacoes` em `agendamentos` (não dispara em INSERT de
  propósito; `tipo` saiu da lista no script 08).
- `trg_sync_agenda_animais_ins` / `_del` — **FOR EACH STATEMENT** com
  transition tables em `agendamento_animais` (um sync por agendamento, não
  por linha — antes gerava eventos duplicados).
- **Não há** trigger de sync em `agendamento_servicos`, de propósito: as
  três RPCs que gravam serviços também regravam `agendamento_animais`, que já
  sincroniza. Um trigger a mais dobraria as chamadas na criação e reabriria
  a corrida que criava eventos duplicados.

### 6.6 RLS e segurança no banco

- RLS ligado nas 10 tabelas; política única: `authenticated` → acesso total
  (`using (true)`). `anon` não lê nada. **Não há papéis** (dona × equipe).
- Consequência: **qualquer conta autenticada vê tudo** — o cadastro público
  no Auth precisa estar **desligado**.
- A `service_role` usada pelo trigger de sync fica no **Vault** (segredos
  `supabase_url` e `service_key`), nunca em `ALTER DATABASE SET` (a tabela
  `pg_db_role_setting` é legível por anon/authenticated).
- Avisos restantes do linter (não críticos): `periodo_agendamento` com
  search_path mutável; `btree_gist` no schema `public`; funções de trigger
  SECURITY DEFINER "executáveis" por anon (inofensivo: o Postgres não executa
  função de trigger fora de trigger); `rls_auto_enable` (event trigger criado
  pelo próprio Supabase).

### 6.7 Scripts em `supabase/`

01 RLS · 02 RPC de recorrência · 03 trigger do Google Agenda (pré-requisitos
no cabeçalho) · 04 regras de negócio no banco · 05 vários animais por
agendamento · 06 RPCs atômicas · 07 revoke do `enfileirar_sync_agenda` · 08
serviços no lugar do tipo (substitui as RPCs do 02 e do 06) · 09 extras do
Hotel num dia específico.
Cada script explica no cabeçalho o problema que resolve. Mudanças no banco
foram aplicadas também como migrations pelo MCP do Supabase.

## 7. Integração com o Google Agenda

Fluxo:

```
escrita no app → trigger no Postgres → enfileirar_sync_agenda (lê URL e
service_key do Vault) → pg_net (HTTP assíncrono) → Edge Function
sincronizar-agenda → JWT RS256 assinado com a chave da service account
(Web Crypto) → access token → Google Calendar API
```

- Edge Function `sincronizar-agenda` (versão 7, `verify_jwt` ligado), arquivo
  único (o deploy só sobe o `index.ts`).
- Um evento por ocorrência (sem RRULE, para cancelar dias isolados).
  Título: `"<nomes dos cães> — <Serviços>"` (ex.: `"Nick — Creche + Banho"`),
  com os serviços lidos de `agendamento_servicos`, sem repetir. Com mais de
  um serviço, a descrição lista cada um, com o dia quando houver
  (`- Banho — 20/08`), sem valores. Fuso `America/Sao_Paulo`.
- **Cancelar apaga o evento**; o registro fica no banco como `cancelado`.
- Nenhum participante é convidado (service account não envia convite).
- Lê `google_calendar_event_id` **direto do banco** (não do payload): como o
  `pg_net` é assíncrono, várias chamadas podem sair com o mesmo retrato e
  criar eventos duplicados.
- Falha de sync **nunca invalida o agendamento**: grava o erro em
  `google_sync_erro`, devolve 200, e o app mostra o aviso na lista.
- Secrets da função (painel do Supabase): `GOOGLE_SERVICE_ACCOUNT` (JSON) e
  `GOOGLE_CALENDAR_ID`. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` são
  injetados pelo Supabase. O código faz `.trim()` no calendar id (o secret
  foi cadastrado com `\n` no fim e causava 404).
- `Deno.env` é lido na subida do worker: **depois de mudar um secret, é
  preciso republicar a função**.
- Service account: `bgm-day-care-serviceaccount@bgm-day-care.iam.gserviceaccount.com`
  — o calendário precisa ser compartilhado com esse e-mail (permissão de
  alterar eventos). `calendarList` vazio é normal para service account.
- Edge Function `diag-calendar` (v3) fica publicada **de propósito**, para
  diagnóstico (testa token, leitura e escrita no calendário).

## 8. Regras de negócio

- **Tutor é o principal**: é quem reserva. O formulário escolhe o tutor
  primeiro e lista só os cães dele; um agendamento pode ter **vários cães do
  mesmo tutor**. O tutor não é gravado no agendamento — é deduzido pelo
  primeiro cão.
- **Serviços** (decisão de 04/10/2026, substitui o tipo único): cada
  agendamento tem um ou mais, cada um com seu valor **livre e opcional** (não
  há tabela de preços).

  | Serviço | Grupo | Período | Plano de estadia | Pertences | Recorrência | Valor |
  |---|---|---|---|---|---|---|
  | Creche (período integral) | principal | só a **data**; horários vêm do plano | **obrigatório** (entrada e saída obrigatórias) | sim | sim | **por dia** |
  | Hotel | principal | início e fim (fim opcional) | não | sim | não | estadia inteira |
  | Visita | principal | início e fim | não | não | não | **não tem** |
  | Banho, Tosa higiênica, Consulta | extra | herdam do principal; sozinhos, início e fim | não | não | não | sim |

  - Creche e Hotel **não** podem ser marcados juntos; Visita fica sempre
    sozinha; extras combinam com Creche, com Hotel ou entre si.
  - Com Creche, todos os valores são por dia: a série copia os serviços em
    cada ocorrência. A lista e o formulário mostram a soma.
  - Forma de pagamento continua só no plano da Creche.
  - **Extras num dia da hospedagem** (só Hotel, decisão de 04/10/2026): o
    Hotel continua um agendamento só; o formulário lista os dias da estadia
    ("Dias da hospedagem") e cada extra pode ser marcado num dia, inclusive
    em vários. Sem dia = estadia toda (os checkboxes de Serviços). Só o dia,
    sem horário. No Google aparece na descrição do evento do Hotel.
- **Creche — valor é a diária** (decisão "opção A"): cada ocorrência tem sua
  cópia dos serviços; um valor de pacote seria replicado em todas. Preço por
  pacote ("opção B") foi **adiado** pelo usuário.
- **Recorrência (só Creche)**: data de início + **duração em semanas** + dias
  da semana. Janela = início + semanas×7 − 1 dia (1 semana = 7 dias a partir
  do início, sem repetir o dia inicial). Horário de cada ocorrência = entrada
  e saída do plano. O formulário mostra a previsão ("Serão geradas N
  ocorrências, até dd/mm").
- **Principais (Creche, Hotel, Visita) não mudam depois de criado**
  (travados com 🔒): cancela-se e cria-se outro. **Extras** entram e saem na
  edição — inclusive numa ocorrência isolada da série (banho num dia só).
- **Cancelar** = status `cancelado`; nunca apaga. "Cancelar este dia" afeta só
  a ocorrência. "Cancelar série inteira" cancela as ocorrências que começam
  **de agora em diante** — as passadas ficam (são registro de frequência e
  cobrança).
- **Dupla reserva** do mesmo cão no mesmo período é barrada no banco; o app
  traduz para "Este animal já tem outro agendamento neste período."
- **Termo de consentimento** é informativo: nunca bloqueia agendamento.
- **Dias da semana**: 0 = domingo (Postgres `dow` = `Date.getDay()`).
- **CPF/CNPJ** obrigatório (formulário e banco). O campo usa teclado comum:
  o CNPJ passou a aceitar letras em jul/2026.
- **Status** possíveis: solicitado, confirmado, em andamento, concluído,
  cancelado.

## 9. Decisões e o porquê (histórico resumido)

- **Agenda local removida** do app: o Google Agenda já cumpre esse papel.
- **Creche sem seção "Período"**: a data é o primeiro dia; horários vêm do
  plano. Depois de um bug (ocorrências caindo à meia-noite), entrada e saída
  viraram obrigatórias.
- **Séries colapsadas** na lista; ocorrências aparecem dentro do agendamento.
- **Vários cães por agendamento** via tabela de junção com espelho de datas
  (para manter a proteção contra dupla reserva).
- **Escrita atômica por RPC** depois de um agendamento órfão.
- **Migração Expo → Next.js PWA** (01/10/2026): acesso por URL instalável, sem
  Expo Go. ~2.000 linhas de lógica vieram sem reescrita; só as telas foram
  refeitas. Bugs antigos corrigidos na migração: série encerrada exibindo
  "Próxima" com data passada; voltar da ficha sem efeito após editar
  (histórico duplicado); peso com ponto em vez de vírgula.
- **Sessão em cookie + proxy** em vez de `localStorage`, para o servidor
  enxergar a sessão.
- **Sem service worker** (dados sempre frescos).
- **Inputs nativos** de data/hora/seleção (seletor do próprio celular).
- **Serviços no lugar do tipo** (04/10/2026): o cliente combina serviços
  (creche + banho, hotel + tosa); com tipo único isso exigiria dois
  agendamentos do mesmo cão no mesmo período, que a dupla reserva barra.
  Valor passou de `planos_estadia` para cada serviço.

## 10. Segurança — restrições que valem sempre

- A **`service_role` nunca passa pelo assistente** nem vai para `.env`/código
  do app. O usuário a cadastra direto no Vault, pelo SQL Editor.
- A **chave privada da service account do Google nunca é mostrada** ao
  assistente; o usuário cadastra os secrets no painel.
- A chave `sb_publishable_...` é pública por design (vai no JavaScript do
  site); quem protege os dados é o RLS. `.env*` está no `.gitignore`.
- Tudo com prefixo `NEXT_PUBLIC_` vai para o bundle público — nunca colocar
  segredo com esse prefixo.

## 11. Como rodar

Na pasta `web/` (ou `npm --prefix web run <script>` da raiz):

| Comando | O que faz |
|---|---|
| `npm run dev` | http://localhost:3000 com o Supabase real (`web/.env.local`) |
| `npm run dev:demo` | http://localhost:3001 com dados de exemplo em memória; login aceita qualquer e-mail com `@` e senha de 4+ caracteres; dados somem ao recarregar |
| `npm test` | Vitest (modo watch; `npx vitest run` roda uma vez) |
| `npm run typecheck` | `next typegen && tsc --noEmit` (os tipos `PageProps`/`LayoutProps` são gerados) |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |

`web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://vatbekoevgazckbgiupt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Ícones: editar `scripts/icone.svg` e rodar `node scripts/gerar-icones.mjs`.

## 12. Convenções de código

- **Nomes em português** (`salvarAgendamento`, `aoMudar`, `rotulo`, `ini`);
  textos de interface em pt-BR com acento; **comentários no código sem
  acento** e explicando o **porquê**, não o quê (densidade alta de
  comentários é o padrão do projeto).
- Arquivos em kebab-case; componentes de feature em
  `features/<modulo>/components/`; rotas em `app/` são finas.
- Em `app/` os imports usam o alias `@/`; dentro de `features/` e `lib/`,
  imports relativos (o Vitest não resolve `@/`).
- Classes Tailwind completas, nunca montadas por interpolação
  (`bg-${cor}` não gera CSS).
- Reaproveitamento visual por **componente** (`<Botao variante>`), não por
  classe nomeada/`@apply`.
- Regras novas de negócio: primeiro em `types/` com teste, depois no
  formulário; se for invariante de dados, também como constraint no banco.
- `web/AGENTS.md` avisa que o Next 16 tem APIs diferentes do que costuma
  aparecer em tutoriais: consultar `web/node_modules/next/dist/docs/` antes
  de escrever código de framework.

## 13. Operação e limites

- **Plano gratuito do Supabase**: limite de 500 MB. Medido: ~12 MB usados
  (quase tudo é a base fixa do Postgres/Supabase) e ~878 bytes por
  agendamento completo → cabem ~580 mil agendamentos. `net._http_response`
  se limpa sozinha (~6 h).
- O projeto **pausa após ~7 dias sem uso** (já aconteceu uma vez); reativa-se
  no painel. Com o app em uso diário, não deve ocorrer.

## 14. Pendências

Prioridade alta (antes de liberar para as donas):
1. **Painel do Supabase → Auth**: desligar "Allow new users to sign up" e
   ligar "Leaked password protection".
2. **Deploy na Vercel**: importar o repo, Root Directory `web`, cadastrar as
   duas variáveis `NEXT_PUBLIC_*`. HTTPS é obrigatório para o PWA (a Vercel
   já fornece).
3. Instalar nos celulares ("Adicionar à tela de início").
4. Apontar `GOOGLE_CALENDAR_ID` para o calendário definitivo (hoje é o de
   testes do usuário), cadastrando sem quebra de linha no fim; compartilhar o
   calendário com a service account; republicar a função.

Depois:
- Revisar valores da série de creche de teste do "Nick" (valores zerados num
  ajuste antigo; preencher só se for dado real).
- Preço por pacote na Creche (opção B) — adiado.
- Mensagem de dupla reserva dizer **qual** cão conflitou.
- Detectar agendamento cujo sync "nunca foi tentado" (hoje só a falha é
  detectada).
- Papéis (dona × equipe) no RLS, se um dia for necessário.

## 15. Sobre o usuário e como trabalhar com ele

- Comunicação em **português do Brasil**. Gosta de entender o porquê das
  coisas — já pediu explicações sobre sintaxe, cache do TanStack Query e o
  fluxo dos formulários, e por um tempo preferiu escrever o código ele mesmo
  com o assistente como revisor. Hoje prefere que o assistente implemente e
  explique as decisões de forma enxuta.
- Já pediu respostas resumidas em alguns momentos para economizar tokens.
- Decisões de produto são dele; quando há opções, apresente-as com uma
  recomendação.
- Ações no painel do Supabase/Google, push e deploy são feitos por ele ou
  confirmados antes. Commits só quando ele pede.
