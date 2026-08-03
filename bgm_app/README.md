# BGM Daycare — App

App Flutter de gestão interna da creche/hotel BGM, com acesso direto ao
Supabase (sem backend próprio).

## Como rodar

```bash
flutter run
```

Nesta fase o app roda com **repositórios em memória** e dados de exemplo
(3 tutores, 4 animais, agendamentos dos 3 tipos e uma série de creche
recorrente já gerada). Não é preciso configurar nada para navegar.

O login aceita qualquer e-mail válido com senha de 4+ caracteres — é o
`FakeAuthRepository`, que existe só enquanto o Supabase Auth não está ligado.

### Verificação

```bash
flutter analyze && flutter test
```

## Estrutura

```
lib/
├── core/          config, tema (paleta), router, formatadores pt_BR
├── shared/        widgets reutilizáveis (chips, estados de lista)
└── features/
    ├── auth/      login + guard de rota
    ├── home/      grid de módulos
    └── estadias/  models · data · providers · ui (Agendamentos | Cães)
supabase/          scripts SQL para rodar no painel
```

Cada feature agrupa `models`, `data`, `providers` e `ui` — assim o módulo
Banho/Tosa entra depois sem mexer no resto.

## Ligando o Supabase

A camada de dados tem duas implementações por trás da mesma interface, então
a virada não toca nas telas.

**1. Rode os scripts** no SQL Editor do painel, nesta ordem:

| Script | O que faz |
|---|---|
| `supabase/01_rls_policies.sql` | Habilita RLS nas 9 tabelas e libera acesso a `authenticated` |
| `supabase/02_fn_gerar_ocorrencias.sql` | Cria a RPC que gera as ocorrências da creche recorrente |

**2. Troque os dois providers:**

```dart
// lib/features/estadias/providers/estadias_providers.dart
final estadiasRepositoryProvider = Provider<EstadiasRepository>(
  (ref) => SupabaseEstadiasRepository(Supabase.instance.client),
);

// lib/features/auth/providers/auth_providers.dart
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => SupabaseAuthRepository(Supabase.instance.client.auth),
);
```

**3. Rode com as credenciais** (nunca commitadas):

```bash
flutter run --dart-define=SUPABASE_URL=https://xxxx.supabase.co --dart-define=SUPABASE_ANON_KEY=sb_publishable_xxx
```

Sem as credenciais o app continua no modo em memória — ver
`core/config/supabase_config.dart`.

**4. Crie os usuários** manualmente no painel (Authentication → Users). Não há
auto-cadastro público.

## Regras de negócio

- **Plano de estadia e pertences** só existem em Hotel e Creche. Visita não
  aceita nenhum dos dois — validado em `ValidacaoAgendamento`.
- **Recorrência** é exclusiva de Creche. Gera uma linha de agendamento por
  ocorrência no período; todas compartilham `agendamento_recorrencia_id`, então
  dá para cancelar uma sem afetar as outras.
- **Cancelar** muda o status para `cancelado` — o registro nunca é apagado.
- **Termo de consentimento** é informativo. Seus itens são conferência manual
  da equipe e nunca bloqueiam um agendamento.
- **Dias da semana** seguem a convenção do Postgres (`0` = domingo), não a do
  Dart (`DateTime.weekday`, 1 = segunda). A conversão fica em
  `DiaSemana.deDateTime`.

## Fora de escopo nesta fase

Banho/Tosa (o card existe, desabilitado), Google Agenda (o campo
`google_calendar_event_id` está reservado), papéis granulares, modo offline e
notificações push.
