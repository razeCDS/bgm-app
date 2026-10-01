'use client';

import { useState, type ReactNode } from 'react';

import { Botao } from '../../../components/botoes';
import { SeletorDataHora } from '../../../components/campos';
import { Janela } from '../../../components/janela';
import { formatarData } from '../../../lib/formatadores';
import { useAnimais, useFiltroAgendamentos, useTutores } from '../hooks';
import {
  rotuloStatus,
  rotuloTipo,
  STATUS_AGENDAMENTO,
  TIPOS_AGENDAMENTO,
} from '../types/enums';
import {
  filtroEstaVazio,
  quantidadeFiltrosAtivos,
  type FiltroAgendamentos,
} from '../types/modelos';

/**
 * Painel de filtros combinaveis da aba Agendamentos.
 * Todos se acumulam: animal E tutor E tipo E status E periodo.
 */
export function PainelFiltros() {
  const { filtro, definir, limparTudo } = useFiltroAgendamentos();
  const animais = useAnimais();
  const tutores = useTutores();
  const [periodoAberto, setPeriodoAberto] = useState(false);

  const temPeriodo = !!filtro.dataInicio || !!filtro.dataFim;
  const ativos = quantidadeFiltrosAtivos(filtro);

  return (
    <div className="bg-neutra-clara px-3 py-2.5">
      <div className="mx-auto max-w-2xl">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          <ChipMenu
            rotulo="Tipo"
            valor={filtro.tipo}
            opcoes={TIPOS_AGENDAMENTO.map((t) => ({ chave: t, texto: rotuloTipo[t] }))}
            aoSelecionar={(v) =>
              definir({ ...filtro, tipo: v as FiltroAgendamentos['tipo'] })
            }
          />
          <ChipMenu
            rotulo="Status"
            valor={filtro.status}
            opcoes={STATUS_AGENDAMENTO.map((v) => ({ chave: v, texto: rotuloStatus[v] }))}
            aoSelecionar={(v) =>
              definir({ ...filtro, status: v as FiltroAgendamentos['status'] })
            }
          />
          <ChipMenu
            rotulo="Animal"
            valor={filtro.animalId}
            opcoes={(animais.data ?? []).map((a) => ({ chave: a.id, texto: a.nome }))}
            aoSelecionar={(v) => definir({ ...filtro, animalId: v })}
          />
          <ChipMenu
            rotulo="Tutor"
            valor={filtro.tutorId}
            opcoes={(tutores.data ?? []).map((t) => ({
              chave: t.id,
              texto: t.nomeCompleto,
            }))}
            aoSelecionar={(v) => definir({ ...filtro, tutorId: v })}
          />
          <CascaChip
            ativo={temPeriodo}
            aoLimpar={
              temPeriodo
                ? () => definir({ ...filtro, dataInicio: null, dataFim: null })
                : undefined
            }
            rotuloLimpar="Limpar período"
          >
            <button
              type="button"
              onClick={() => setPeriodoAberto(true)}
              className="absolute inset-0"
              aria-label="Filtrar por período"
            />
            {textoPeriodo(filtro)}
          </CascaChip>
        </div>

        {!filtroEstaVazio(filtro) ? (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-texto-suave">
              {ativos} {ativos === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
            <button
              type="button"
              onClick={limparTudo}
              className="text-[13px] font-semibold text-primaria"
            >
              Limpar tudo
            </button>
          </div>
        ) : null}
      </div>

      <Janela
        aberto={periodoAberto}
        aoFechar={() => setPeriodoAberto(false)}
        titulo="Período"
      >
        <SeletorDataHora
          rotulo="De"
          apenasData
          valor={filtro.dataInicio}
          aoMudar={(d) =>
            definir({
              ...filtro,
              dataInicio: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
            })
          }
          aoLimpar={() => definir({ ...filtro, dataInicio: null })}
        />
        <SeletorDataHora
          rotulo="Até"
          apenasData
          valor={filtro.dataFim}
          aoMudar={(d) =>
            definir({
              ...filtro,
              // Inclui o dia final inteiro.
              dataFim: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
            })
          }
          aoLimpar={() => definir({ ...filtro, dataFim: null })}
        />
        <Botao className="w-full" onClick={() => setPeriodoAberto(false)}>
          Aplicar
        </Botao>
      </Janela>
    </div>
  );
}

function textoPeriodo(f: FiltroAgendamentos): string {
  if (!f.dataInicio && !f.dataFim) return 'Período';
  const ini = f.dataInicio ? formatarData(f.dataInicio) : '…';
  const fim = f.dataFim ? formatarData(f.dataFim) : '…';
  return `${ini} — ${fim}`;
}

/**
 * Chip com lista de opcoes.
 *
 * Por baixo do chip ha um `<select>` nativo invisivel cobrindo a area toda:
 * o toque abre o seletor do proprio celular, mas o visual continua o do
 * chip. O ✕ fica por cima (`z-10`) para limpar sem abrir a lista.
 */
function ChipMenu({
  rotulo,
  valor,
  opcoes,
  aoSelecionar,
}: {
  rotulo: string;
  valor: string | null;
  opcoes: Array<{ chave: string; texto: string }>;
  aoSelecionar: (v: string | null) => void;
}) {
  const selecionado = opcoes.find((o) => o.chave === valor)?.texto ?? null;

  return (
    <CascaChip
      ativo={!!valor}
      aoLimpar={valor ? () => aoSelecionar(null) : undefined}
      rotuloLimpar={`Limpar ${rotulo}`}
    >
      <select
        aria-label={rotulo}
        value={valor ?? ''}
        onChange={(e) => aoSelecionar(e.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">Todos — {rotulo}</option>
        {opcoes.map((o) => (
          <option key={o.chave} value={o.chave}>
            {o.texto}
          </option>
        ))}
      </select>
      {/* Filtro guardado de um animal/tutor ainda nao carregado: mostra o
          rotulo, mas segue ativo (o ✕ continua disponivel). */}
      {selecionado ?? rotulo}
    </CascaChip>
  );
}

/** Visual comum dos chips de filtro. */
function CascaChip({
  ativo,
  aoLimpar,
  rotuloLimpar,
  children,
}: {
  ativo: boolean;
  aoLimpar?: () => void;
  rotuloLimpar: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-[13px] whitespace-nowrap ${
        ativo
          ? 'border-primaria bg-primaria font-semibold text-white'
          : 'border-neutra bg-white text-texto-escuro'
      }`}
    >
      {children}
      {ativo && aoLimpar ? (
        <button
          type="button"
          onClick={aoLimpar}
          aria-label={rotuloLimpar}
          className="relative z-10 -my-1 -mr-1 px-1 text-xs"
        >
          ✕
        </button>
      ) : (
        <span className={`text-xs ${ativo ? '' : 'text-texto-suave'}`}>▾</span>
      )}
    </span>
  );
}
