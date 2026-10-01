'use client';

import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Cabecalho } from '../../../components/cabecalho';

const ABAS = [
  { href: '/estadias/agendamentos', texto: 'Agendamentos', icone: '📋' },
  { href: '/estadias/clientes', texto: 'Clientes', icone: '🐾' },
] as const;

/**
 * Cabecalho do modulo Estadias com as abas.
 *
 * No mobile a aba ativa era um `useState`; aqui cada aba e uma URL. O botao
 * voltar e o recarregar da pagina mantem a aba — antes, voltavam sempre
 * para Agendamentos.
 */
export function AbasEstadias({ children }: { children: ReactNode }) {
  const caminho = usePathname();

  return (
    <>
      <Cabecalho titulo="BGM Estadias" voltarPara="/" acoes={<BotaoAtualizar />}>
        <nav className="mx-auto flex max-w-3xl" role="tablist">
          {ABAS.map((a) => {
            const ativa = caminho.startsWith(a.href);
            return (
              <Link
                key={a.href}
                href={a.href}
                role="tab"
                aria-selected={ativa}
                replace
                className={`flex flex-1 flex-col items-center border-b-3 py-2 ${
                  ativa ? 'border-acento font-bold text-white' : 'border-transparent text-white/80'
                }`}
              >
                <span className="text-base">{a.icone}</span>
                <span className="mt-0.5 text-sm">{a.texto}</span>
              </Link>
            );
          })}
        </nav>
      </Cabecalho>
      {children}
    </>
  );
}

/**
 * Substitui o "puxar para atualizar" do mobile, que nao existe num PWA
 * instalado. Na maioria das vezes nem e preciso: o TanStack Query ja
 * recarrega sozinho quando o app volta para a frente da tela.
 */
function BotaoAtualizar() {
  const qc = useQueryClient();
  const buscando = useIsFetching() > 0;

  return (
    <button
      type="button"
      aria-label="Atualizar"
      onClick={() => void qc.invalidateQueries()}
      className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-5 ${buscando ? 'animate-spin' : ''}`}
        aria-hidden
      >
        <path
          d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
