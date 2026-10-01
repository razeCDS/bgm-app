'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { useDialogo } from '../../components/dialogo';
import { useSessao } from '../auth/store';
import { emMemoria } from '../../lib/repositorios';

interface Modulo {
  titulo: string;
  icone: string;
  /** `null` significa modulo ainda nao implementado. */
  rota: '/estadias' | null;
}

/**
 * Menu inicial de modulos.
 *
 * Estruturado como lista de dados para crescer sem mexer no layout:
 * basta acrescentar um item.
 */
const MODULOS: Modulo[] = [
  { titulo: 'BGM Estadias', icone: '🏠', rota: '/estadias' },
  { titulo: 'BGM Banho/Tosa', icone: '💧', rota: null },
];

export function TelaModulos() {
  const { usuario, sair } = useSessao();
  const qc = useQueryClient();
  const { avisar } = useDialogo();

  async function aoSair() {
    await sair();
    // O cache guarda dados de clientes. Num aparelho compartilhado, o
    // proximo a entrar nao pode ver o que ficou da sessao anterior.
    qc.clear();
    // O redirecionamento para /login e feito pelo GuardSessao.
  }

  return (
    <>
      <header className="bg-primaria pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <h1 className="text-xl font-semibold">BGM Gestão Interna</h1>
          <button
            type="button"
            onClick={() => void aoSair()}
            className="-mr-2 p-2 text-sm font-semibold"
          >
            Sair
          </button>
        </div>
      </header>

      {emMemoria ? (
        <p className="bg-acento/35 px-4 py-2 text-xs font-semibold text-primaria-escura">
          Modo demonstração — dados de exemplo, nada é salvo de verdade.
        </p>
      ) : null}

      <main className="mx-auto w-full max-w-3xl px-4">
        {usuario ? <p className="pt-4 text-texto-suave">Olá, {usuario.email}</p> : null}

        <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
          {MODULOS.map((m) => {
            const conteudo = (
              <>
                <span
                  className={`relative flex aspect-[1.1] items-center justify-center rounded-xl bg-primaria text-5xl ${
                    m.rota ? '' : 'opacity-45'
                  }`}
                >
                  <span className={m.rota ? '' : 'opacity-60'}>{m.icone}</span>
                  {!m.rota ? (
                    <span className="absolute top-2 right-2 text-[11px] font-semibold text-white">
                      em breve
                    </span>
                  ) : null}
                </span>
                <span
                  className={`mt-2 block text-center text-sm font-bold ${
                    m.rota ? 'text-texto-escuro' : 'text-texto-suave'
                  }`}
                >
                  {m.titulo}
                </span>
              </>
            );
            // O cartao inteiro (icone + rotulo) e clicavel.
            return m.rota ? (
              <Link key={m.titulo} href={m.rota}>
                {conteudo}
              </Link>
            ) : (
              <button
                key={m.titulo}
                type="button"
                className="text-left"
                onClick={() =>
                  void avisar(m.titulo, 'Este módulo estará disponível em uma próxima fase.')
                }
              >
                {conteudo}
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}
