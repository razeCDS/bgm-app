# BGM Daycare — web (PWA)

App interno do BGM Daycare em Next.js 16, instalável no celular como PWA.
Substituiu o antigo app Expo (`mobile/`, removido do repositório — está no
histórico do git). A camada de regras, repositórios e hooks veio de lá sem
reescrita; só as telas foram refeitas. Os comentários que citam "o mobile"
explicam de onde veio cada decisão.

## Rodar

| Comando | O que faz |
|---|---|
| `npm run dev` | App em http://localhost:3000 falando com o Supabase real (`.env.local`) |
| `npm run dev:demo` | App em http://localhost:3001 com dados de exemplo em memória — nada vai para o banco. Login aceita qualquer e-mail com `@` e senha de 4+ caracteres |
| `npm test` | Testes (Vitest) |
| `npm run typecheck` | Gera os tipos das rotas e roda o `tsc` |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção (o mesmo que a Vercel roda) |

`.env.local` (não versionado):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

Nunca coloque a `service_role` aqui: tudo com `NEXT_PUBLIC_` vai para o
JavaScript público do site.

## Estrutura

```
src/
  app/                 rotas (arquivos finos: só montam a tela)
    (app)/             telas logadas — o layout tem o guard de sessão
    login/
    manifest.ts        manifesto do PWA
  proxy.ts             roda antes de cada página: renova o token e redireciona
  components/          campos, botões, diálogo, cabeçalho...
  features/
    auth/              sessão, login, guard
    estadias/
      types/           regras de negócio puras (testadas)
      data/            repositórios fake e Supabase (mesmo contrato)
      hooks/           TanStack Query + Zustand
      components/      telas do módulo
  lib/                 supabase, formatadores, datas, navegação
scripts/               dev em modo demo, geração dos ícones
```

## Decisões que não são óbvias

- **Sessão em cookie** (`@supabase/ssr`): é o que deixa o `proxy.ts` saber, no
  servidor, se há alguém logado. Quem protege os dados é o RLS, não o proxy.
- **Sem service worker**: instalar não depende dele, e cache offline mostraria
  agenda desatualizada sem ninguém perceber.
- **Inputs nativos** de data/hora/seleção: no celular abrem o seletor do
  próprio sistema. Conversão de/para `Date` em `lib/datas-input.ts` (cuidado
  com fuso — ver comentário lá).
- **Ícones**: desenho em `scripts/icone.svg`; regenere com
  `node scripts/gerar-icones.mjs`.
