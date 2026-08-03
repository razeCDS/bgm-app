# BGM Daycare — App (React Native / Expo)

App de gestão interna da creche/hotel BGM, com acesso direto ao Supabase
(sem backend próprio).

## Como rodar

```bash
npm start
```

Abra no celular com o app **Expo Go** (QR code no terminal), ou pressione `a`
para abrir num emulador Android.

Nesta fase o app roda com **repositórios em memória** e dados de exemplo
(3 tutores, 4 animais, agendamentos dos 3 tipos e uma série de creche
recorrente já gerada). Não é preciso configurar nada para navegar.

O login aceita qualquer e-mail válido com senha de 4+ caracteres — é o
`AuthFake`, que existe só enquanto o Supabase Auth não está ligado.

### Verificação

```bash
npm run typecheck && npm test
```

## Estrutura

```
app/                       rotas (file-based, expo-router)
├── _layout.tsx            providers + guard de autenticação
├── login.tsx
├── index.tsx              home (grid de módulos)
└── estadias/
    ├── index.tsx          abas Agendamentos | Cães
    ├── agendamento/       novo · [id]
    └── animal/            novo · [id] · [id]/editar

src/
├── theme/                 paleta e tokens de estilo
├── lib/                   supabase, formatadores pt-BR
├── components/            campos de formulário, chips, estados de lista
└── features/
    ├── auth/              repositório (fake + supabase) + store
    └── estadias/
        ├── types/         enums, modelos, validação
        ├── data/          repositório: interface + fake + supabase
        ├── hooks/         queries/mutations (TanStack) e stores (Zustand)
        └── components/    telas do módulo

supabase/                  scripts SQL para rodar no painel
```

As rotas em `app/` são finas de propósito: só extraem parâmetros e delegam
para os componentes em `src/features`. Assim a lógica não fica acoplada ao
roteador.

## Ligando o Supabase

A camada de dados tem duas implementações por trás da mesma interface, então
a virada não toca nas telas.

**1. Rode os scripts** no SQL Editor do painel, nesta ordem:

| Script | O que faz |
|---|---|
| `supabase/01_rls_policies.sql` | Habilita RLS nas 9 tabelas e libera acesso a `authenticated` |
| `supabase/02_fn_gerar_ocorrencias.sql` | Cria a RPC que gera as ocorrências da creche recorrente |

**2. Crie um `.env`** na raiz de `mobile/` (já está no `.gitignore`):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

Só isso — **não há código a alterar**. O chaveamento é automático (veja abaixo).
Reinicie com `npx expo start --clear`, porque variáveis `EXPO_PUBLIC_*` são
embutidas no bundle em tempo de build.

**3. Crie os usuários** manualmente no painel (Authentication → Users). Não há
auto-cadastro público. Sem um usuário válido o login não passa, e a RLS
bloqueia toda leitura — as telas ficariam vazias.

## Chaveamento: memória × Supabase

Existe **um único ponto de decisão**, em
[`src/lib/repositorios.ts`](src/lib/repositorios.ts):

```ts
export const modoDados = supabaseConfigurado ? 'supabase' : 'memoria';

export const estadiasRepositorio = supabaseConfigurado
  ? new RepositorioSupabase()
  : new RepositorioFake();

export const authRepositorio = supabaseConfigurado
  ? new AuthSupabase()
  : new AuthFake();
```

`supabaseConfigurado` (em [`src/lib/supabase.ts`](src/lib/supabase.ts)) é
simplesmente "as duas variáveis do `.env` existem". Ou seja:

| `.env` | Modo | Dados |
|---|---|---|
| ausente | memória | exemplos, some ao fechar |
| presente | Supabase | banco real, exige login |

**Nenhum outro arquivo instancia repositório** — todos importam de
`repositorios.ts`. Quando o app está em memória, a Home mostra uma faixa
"Modo demonstração", para não haver dúvida sobre por que um cadastro sumiu.

## Regras de negócio

- **Plano de estadia** descreve a rotina diária (tipo de plano, total de dias,
  horários) e só existe na **Creche**. No **Hotel**, entrada e saída são o
  próprio período do agendamento — lá só há valor da estadia e pertences.
- **Visita** não tem plano, valor nem pertences.
- **Recorrência** é exclusiva de Creche. Gera uma linha de agendamento por
  ocorrência no período; todas compartilham `agendamento_recorrencia_id`,
  então dá para cancelar uma sem afetar as outras.
- **Cancelar** muda o status para `cancelado` — o registro nunca é apagado.
- **Termo de consentimento** é informativo. Seus itens são conferência manual
  da equipe e nunca bloqueiam um agendamento.
- **Dias da semana** seguem a convenção do Postgres (`0` = domingo), que
  coincide com `Date.getDay()` do JavaScript — não há conversão.
- **Idade** é `text` no banco, mas tratada como número no app.
- **CPF/CNPJ** aceita nulo no banco, mas é obrigatório no formulário.

## Fora de escopo nesta fase

Banho/Tosa (o card existe, desabilitado), Google Agenda (o campo
`google_calendar_event_id` está reservado), papéis granulares, modo offline e
notificações push.
