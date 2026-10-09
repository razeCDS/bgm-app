import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { ROTA_INICIAL } from './lib/rotas';

/**
 * Porta de entrada: roda no servidor ANTES de qualquer pagina.
 *
 * Duas tarefas:
 *  1. Renovar o token da sessao (que vive num cookie) quando ele expira, e
 *     devolver o cookie novo na resposta.
 *  2. Redirecionar: sem sessao, tudo leva a /login; com sessao, /login leva
 *     para a rota inicial (os agendamentos).
 *
 * Isto e conveniencia de navegacao, NAO seguranca. Quem protege os dados e
 * o RLS no banco: mesmo que alguem burlasse este redirecionamento, as
 * consultas sem sessao voltariam vazias.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  // Modo em memoria (sem .env): a sessao fake vive so no navegador, entao
  // nao ha o que verificar aqui — o guard do layout cuida disso.
  if (!url || !chave) return NextResponse.next();

  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, cabecalhos) {
        // O cookie renovado precisa ir nos dois lados: na requisicao (para
        // a pagina que vai renderizar agora) e na resposta (para o
        // navegador guardar).
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        );
        // Resposta com cookie de sessao nao pode ficar em cache de CDN —
        // senao o token de um usuario seria servido a outro.
        Object.entries(cabecalhos).forEach(([k, v]) => resposta.headers.set(k, v));
      },
    },
  });

  // `getClaims` valida a assinatura do token. Nao use `getSession` aqui:
  // ela confia no cookie sem verificar, e cookie o cliente pode forjar.
  const { data } = await supabase.auth.getClaims();
  const logado = !!data?.claims;
  const naTelaDeLogin = request.nextUrl.pathname === '/login';

  if (!logado && !naTelaDeLogin) {
    return redirecionar(request, '/login', resposta);
  }
  if (logado && naTelaDeLogin) {
    return redirecionar(request, ROTA_INICIAL, resposta);
  }
  return resposta;
}

/**
 * Redireciona sem perder o que o Supabase acabou de escrever na resposta:
 * os cookies renovados e os cabecalhos que impedem cache.
 */
function redirecionar(request: NextRequest, destino: string, base: NextResponse) {
  const r = NextResponse.redirect(new URL(destino, request.url));
  base.cookies.getAll().forEach((c) => r.cookies.set(c));
  for (const k of ['cache-control', 'expires', 'pragma']) {
    const v = base.headers.get(k);
    if (v) r.headers.set(k, v);
  }
  return r;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estaticos, icones e o manifesto do PWA — o
    // navegador busca o manifesto e os icones antes do login, e um
    // redirecionamento ali quebraria a instalacao.
    '/((?!_next/static|_next/image|manifest.webmanifest|.*\\.(?:png|ico|svg|webp)$).*)',
  ],
};
