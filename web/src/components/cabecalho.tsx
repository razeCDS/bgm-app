'use client';

import type { ReactNode } from 'react';

import { useVoltar } from '../lib/navegacao';

/**
 * Barra superior — no mobile vinha pronta do `Stack` do expo-router.
 *
 * O `pt-[env(safe-area-inset-top)]` empurra o conteudo para baixo do
 * entalhe/relogio do iPhone quando o app esta instalado (sem barra do
 * navegador, a pagina comeca no topo fisico da tela).
 */
export function Cabecalho({
  titulo,
  voltarPara,
  acoes,
  children,
}: {
  titulo: string;
  /** Rota de destino quando nao ha historico no app. Sem ela, nao ha voltar. */
  voltarPara?: string;
  acoes?: ReactNode;
  /** Conteudo extra preso ao cabecalho (ex.: abas). */
  children?: ReactNode;
}) {
  const voltar = useVoltar(voltarPara ?? '/');

  return (
    <header className="sticky top-0 z-20 bg-primaria pt-[env(safe-area-inset-top)] text-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
        {voltarPara ? (
          <button
            type="button"
            onClick={voltar}
            aria-label="Voltar"
            className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="flex-1 truncate text-lg font-semibold">{titulo}</h1>
        {acoes}
      </div>
      {children}
    </header>
  );
}
