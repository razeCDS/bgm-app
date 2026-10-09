'use client';

import Link from 'next/link';

import { classesFab } from '../../../components/botoes';
import { Carregando, EstadoErro, EstadoVazio } from '../../../components/estados';
import { mensagemDeErro } from '../../../lib/erros';
import { useAnimais, useBuscaAnimais } from '../hooks';
import type { Animal } from '../types/modelos';
import { resumoAnimal } from '../types/modelos';

export function AbaCaes() {
  const { busca, definir, limpar } = useBuscaAnimais();
  const { data, isPending, error, refetch } = useAnimais();

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-neutra-clara p-3">
        <div className="relative mx-auto max-w-2xl">
          <input
            type="search"
            value={busca}
            onChange={(e) => definir(e.target.value)}
            placeholder="Buscar por nome, raça ou tutor…"
            aria-label="Buscar clientes"
            className="w-full rounded-campo bg-white px-3.5 py-3 pr-10 text-base text-texto-escuro outline-none placeholder:text-texto-suave focus:ring-2 focus:ring-primaria/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {busca ? (
            <button
              type="button"
              onClick={limpar}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 -translate-y-1/2 p-2 text-base text-texto-suave"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <EstadoErro mensagem={mensagemDeErro(error)} aoTentarNovamente={() => refetch()} />
      ) : data.length === 0 ? (
        <EstadoVazio
          icone="🐾"
          titulo={busca ? 'Nenhum resultado' : 'Nenhum cão cadastrado'}
          descricao={
            busca
              ? 'Tente outro termo de busca.'
              : 'Toque em + Novo cliente para cadastrar o primeiro.'
          }
        />
      ) : (
        <ul className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 p-3 pb-24">
          {data.map((a) => (
            <li key={a.id}>
              <Cartao animal={a} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/estadias/animal/novo" className={classesFab}>
        + Novo cliente
      </Link>
    </div>
  );
}

function Cartao({ animal }: { animal: Animal }) {
  const resumo = resumoAnimal(animal);

  return (
    <Link
      href={`/estadias/animal/${animal.id}`}
      className="flex items-center gap-3.5 rounded-xl border border-neutra bg-white p-4 transition-colors hover:bg-neutra-clara/50"
    >
      <span className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-acento/35 text-[26px]">
        {animal.especie === 'felina' ? '🐈' : '🐕'}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-bold text-texto-escuro">{animal.nome}</span>
        {resumo ? <span className="text-[13px] text-texto-suave">{resumo}</span> : null}
        {animal.tutor ? (
          <span className="text-xs text-texto-suave">👤 {animal.tutor.nomeCompleto}</span>
        ) : null}
      </span>
      <span className="text-2xl text-neutra">›</span>
    </Link>
  );
}
