'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { classesFab } from '../../../components/botoes';
import { ChipStatus, ChipTipo } from '../../../components/chips';
import { Carregando, EstadoErro, EstadoVazio } from '../../../components/estados';
import { mensagemDeErro } from '../../../lib/erros';
import { formatarIntervalo, formatarMoeda } from '../../../lib/formatadores';
import { useAgendamentos, useFiltroAgendamentos } from '../hooks';
import type { Agendamento } from '../types/modelos';
import { filtroEstaVazio } from '../types/modelos';
import { PainelFiltros } from './painel-filtros';

/**
 * Uma linha da lista: ou um agendamento solto, ou uma serie recorrente
 * inteira representada por uma unica entrada.
 */
interface Linha {
  chave: string;
  /** A ocorrencia que da o rosto da linha (a proxima ainda por vir). */
  destaque: Agendamento;
  /** > 1 quando a linha resume uma serie. */
  total: number;
  restantes: number;
  /** Quantas ocorrencias falharam ao espelhar no Google. */
  comFalhaSync: number;
}

/**
 * Colapsa series recorrentes em uma linha so.
 *
 * Uma creche de 3x por semana durante 3 meses gera ~36 ocorrencias; lista-las
 * individualmente afogava todo o resto. A linha mostra a proxima ocorrencia
 * futura — nao a primeira da serie, que costuma ja ter passado.
 */
function agruparSeries(agendamentos: Agendamento[]): Linha[] {
  const agora = Date.now();
  const series = new Map<string, Agendamento[]>();
  const linhas: Linha[] = [];

  for (const a of agendamentos) {
    const serie = a.agendamentoRecorrenciaId;
    if (!serie) {
      linhas.push({
        chave: a.id,
        destaque: a,
        total: 1,
        restantes: 0,
        comFalhaSync: a.googleSyncErro ? 1 : 0,
      });
      continue;
    }
    const atual = series.get(serie);
    if (atual) atual.push(a);
    else series.set(serie, [a]);
  }

  for (const [serie, itens] of series) {
    const ordenados = [...itens].sort(
      (x, y) => x.dataHoraInicio.getTime() - y.dataHoraInicio.getTime(),
    );
    const ativas = ordenados.filter((a) => a.status !== 'cancelado');
    const futuras = ativas.filter((a) => a.dataHoraInicio.getTime() >= agora);
    linhas.push({
      chave: serie,
      // Toda a serie no passado: mostramos a ultima, para nao sumir da lista.
      destaque: futuras[0] ?? ativas[ativas.length - 1] ?? ordenados[0],
      total: ordenados.length,
      restantes: futuras.length,
      // Uma ocorrencia com falha ja basta para a serie merecer aviso.
      comFalhaSync: ordenados.filter((a) => a.googleSyncErro).length,
    });
  }

  return linhas.sort(
    (a, b) =>
      a.destaque.dataHoraInicio.getTime() - b.destaque.dataHoraInicio.getTime(),
  );
}

export function AbaAgendamentos() {
  const { data, isPending, error, refetch } = useAgendamentos();
  const { filtro, limparTudo } = useFiltroAgendamentos();

  const linhas = useMemo(() => agruparSeries(data ?? []), [data]);
  const semFiltro = filtroEstaVazio(filtro);

  return (
    <div className="flex flex-1 flex-col">
      <PainelFiltros />

      {isPending ? (
        <Carregando />
      ) : error ? (
        <EstadoErro mensagem={mensagemDeErro(error)} aoTentarNovamente={() => refetch()} />
      ) : linhas.length === 0 ? (
        <EstadoVazio
          icone="📭"
          titulo={semFiltro ? 'Nenhum agendamento' : 'Nenhum resultado para os filtros'}
          descricao={
            semFiltro
              ? 'Toque em + Novo para criar o primeiro agendamento.'
              : 'Ajuste ou limpe os filtros para ver mais.'
          }
          acao={semFiltro ? undefined : { texto: 'Limpar filtros', aoTocar: limparTudo }}
        />
      ) : (
        // `pb-24`: espaco para o botao flutuante nao cobrir o ultimo cartao.
        <ul className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 p-3 pb-24">
          {linhas.map((l) => (
            <li key={l.chave}>
              <Cartao linha={l} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/estadias/agendamento/novo" className={classesFab}>
        + Novo
      </Link>
    </div>
  );
}

function Cartao({ linha }: { linha: Linha }) {
  const a = linha.destaque;
  const cancelado = a.status === 'cancelado';
  const serie = linha.total > 1;
  const valor = a.planoEstadia?.valorTotal;

  return (
    <Link
      href={`/estadias/agendamento/${a.id}`}
      className="flex flex-col gap-2 rounded-xl border border-neutra bg-white p-4 transition-colors hover:bg-neutra-clara/50"
    >
      {/*
        O tutor virou o principal — e ele quem reserva. Os caes vem logo
        abaixo, porque um mesmo agendamento pode atender varios.
      */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex-1 text-base font-bold ${
            cancelado ? 'text-texto-suave line-through' : 'text-texto-escuro'
          }`}
        >
          {a.animais?.[0]?.tutor?.nomeCompleto ?? 'Tutor'}
        </span>
        <ChipStatus status={a.status} />
      </div>

      {a.animais && a.animais.length > 0 ? (
        <span className="text-[13px] text-texto-suave">
          {a.animais.length > 1 ? 'Cães: ' : 'Cão: '}
          {a.animais.map((c) => c.nome).join(', ')}
        </span>
      ) : null}

      {linha.comFalhaSync > 0 && !cancelado ? (
        // Falha de sync nao invalida o agendamento — ele vale no app de
        // qualquer forma. O aviso existe porque o Google e hoje a unica
        // visao por data, e um erro silencioso passaria despercebido.
        <span className="rounded-lg bg-acento px-2 py-1.5 text-xs font-semibold text-primaria-escura">
          ⚠️ Não apareceu no Google Agenda
          {linha.total > 1 ? ` (${linha.comFalhaSync} de ${linha.total})` : ''}
        </span>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <ChipTipo tipo={a.tipo} />
        <span className="flex-1 text-xs text-texto-suave">
          {/* Serie encerrada destaca a ULTIMA ocorrencia — "Próxima" ai
              apontaria para uma data que ja passou. */}
          {serie ? (linha.restantes > 0 ? 'Próxima: ' : 'Última: ') : ''}
          {formatarIntervalo(a.dataHoraInicio, a.dataHoraFim)}
        </span>
      </div>

      {serie || valor != null ? (
        <div className="flex items-center justify-between">
          {serie ? (
            <span className="text-xs font-medium text-primaria">
              🔁 {linha.total} ocorrências
              {linha.restantes > 0 ? ` · ${linha.restantes} a vir` : ' · encerrada'}
            </span>
          ) : (
            <span />
          )}
          {valor != null ? (
            // Na Creche o valor e da diaria; sem o sufixo, o numero de uma
            // ocorrencia parece o total da serie.
            <span className="text-[13px] font-semibold text-primaria-escura">
              {formatarMoeda(valor)}
              {a.tipo === 'creche' ? '/dia' : ''}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
