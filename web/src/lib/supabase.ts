import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase do navegador.
 *
 * As credenciais vem de `web/.env.local` (nao versionado). O prefixo
 * `NEXT_PUBLIC_` faz o Next embutir o valor no JavaScript no build — por
 * isso o acesso precisa ser literal (`process.env.NEXT_PUBLIC_X`), nunca
 * desestruturado:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
 *
 * `createBrowserClient` (e nao o `createClient` do supabase-js) guarda a
 * sessao num COOKIE: ele viaja em toda requisicao, e o `proxy.ts` consegue
 * saber no servidor se ha alguem logado. No `localStorage` o servidor nao
 * enxergaria a sessao.
 *
 * Enquanto `supabaseConfigurado` for `false`, o app roda com os
 * repositorios em memoria (ver `npm run dev:demo`).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigurado = url.length > 0 && chave.length > 0;

// O ternario nao e opcional: `createBrowserClient` lanca erro com URL ou
// chave vazias, e sem ele o modo em memoria quebraria ja no import.
export const supabase = supabaseConfigurado
  ? createBrowserClient(url, chave)
  : null;

/** Uso interno das implementacoes Supabase, que so rodam quando configurado. */
export function exigirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
