import {
  exigePlanoEstadia,
  permiteRecorrencia,
  rotuloTipo,
  temEstadia,
  type DiaSemana,
  type StatusAgendamento,
  type TipoAgendamento,
} from './enums';
import type {
  Agendamento,
  PertencesDeixados,
  PlanoEstadia,
} from './modelos';

/**
 * Dados de entrada para criar/editar um agendamento.
 * Agrupa o agendamento e seus relacionamentos 1:1, gravados juntos.
 */
export interface EntradaAgendamento {
  animalId: string;
  tipo: TipoAgendamento;
  dataHoraInicio: Date;
  dataHoraFim: Date | null;
  status: StatusAgendamento;
  recorrente: boolean;
  diasSemanaRecorrencia: DiaSemana[];
  observacoes: string | null;
  planoEstadia: PlanoEstadia | null;
  pertencesDeixados: PertencesDeixados | null;
}

/** Deve gerar uma serie de ocorrencias via RPC. */
export const geraRecorrencia = (e: EntradaAgendamento) =>
  e.recorrente &&
  permiteRecorrencia(e.tipo) &&
  e.diasSemanaRecorrencia.length > 0;

export function entradaDe(a: Agendamento): EntradaAgendamento {
  return {
    animalId: a.animalId,
    tipo: a.tipo,
    dataHoraInicio: a.dataHoraInicio,
    dataHoraFim: a.dataHoraFim,
    status: a.status,
    recorrente: a.recorrente,
    diasSemanaRecorrencia: a.diasSemanaRecorrencia,
    observacoes: a.observacoes,
    planoEstadia: a.planoEstadia ?? null,
    pertencesDeixados: a.pertencesDeixados ?? null,
  };
}

/** Erro de regra de negocio, exibido ao usuario como mensagem amigavel. */
export class ErroValidacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

/**
 * Mensagem unica para a dupla reserva, usada pelas duas implementacoes do
 * repositorio — o banco barra via constraint `excl_animal_sem_sobreposicao`,
 * e o repositorio em memoria reproduz a mesma regra.
 */
export const ERRO_SOBREPOSICAO =
  'Este animal já tem outro agendamento neste período.';

/**
 * Intervalo que um agendamento ocupa na agenda do animal.
 *
 * Espelha a funcao `periodo_agendamento` do Postgres: fim nulo assume uma
 * hora, e o intervalo nunca e vazio (senao um agendamento com fim igual ao
 * inicio nao colidiria com nada e escaparia da protecao).
 */
export function periodoOcupado(
  inicio: Date,
  fim: Date | null,
): [Date, Date] {
  const minimo = new Date(inicio.getTime() + 60_000);
  const bruto = fim ?? new Date(inicio.getTime() + 3_600_000);
  return [inicio, bruto > minimo ? bruto : minimo];
}

/** Dois intervalos se cruzam? (fim exclusivo, como o `tstzrange` padrao) */
export function periodosSobrepoem(
  a: [Date, Date],
  b: [Date, Date],
): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

/**
 * Ultimo dia coberto por uma recorrencia de N semanas contadas a partir de
 * `inicio` (inclusive).
 *
 * 1 semana = os 7 dias que comecam no proprio dia de inicio, por isso o
 * `- 1`: comecando numa segunda com 1 semana, a janela termina no domingo
 * seguinte, e nao na segunda da semana depois (o que geraria uma segunda
 * ocorrencia da mesma segunda-feira).
 */
export function fimDaJanela(inicio: Date, semanas: number): Date {
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  d.setDate(d.getDate() + semanas * 7 - 1);
  return d;
}

/** Combina a data de `base` com um horario "HH:mm". Hora invalida = meia-noite. */
export function comHorario(base: Date, hora: string | null): Date {
  const [h, m] = (hora ?? '').split(':').map(Number);
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
  );
}

/**
 * Regras de negocio do agendamento.
 *
 * O Termo de Consentimento **nao** entra aqui de proposito: seus itens sao
 * conferencia manual da equipe e nunca bloqueiam um agendamento.
 *
 * Retorna a mensagem do primeiro erro encontrado, ou `null` se valido.
 */
export function validarAgendamento(e: EntradaAgendamento): string | null {
  if (!e.animalId) {
    return 'Selecione o animal.';
  }

  if (e.dataHoraFim && e.dataHoraFim < e.dataHoraInicio) {
    return 'A data/hora final nao pode ser anterior a inicial.';
  }

  // Plano de estadia (rotina diaria) e obrigatorio apenas na Creche.
  // O Hotel pode ter apenas o valor da estadia — ou nem isso.
  if (exigePlanoEstadia(e.tipo) && !e.planoEstadia) {
    return `Plano de estadia e obrigatorio para ${rotuloTipo[e.tipo]}.`;
  }

  // Visita nao registra estadia.
  if (!temEstadia(e.tipo)) {
    if (e.planoEstadia) {
      return 'Agendamento do tipo Visita nao possui plano de estadia.';
    }
    if (e.pertencesDeixados) {
      return 'Agendamento do tipo Visita nao possui pertences deixados.';
    }
  }

  // Recorrencia: exclusiva de Creche.
  if (e.recorrente) {
    if (!permiteRecorrencia(e.tipo)) {
      return 'Recorrencia so e permitida para agendamentos de Creche.';
    }
    if (e.diasSemanaRecorrencia.length === 0) {
      return 'Informe ao menos um dia da semana para a recorrencia.';
    }
    if (!e.dataHoraFim) {
      return 'Informe a data final do periodo da recorrencia.';
    }
  }

  return null;
}

export function garantirValido(e: EntradaAgendamento): void {
  const erro = validarAgendamento(e);
  if (erro) throw new ErroValidacao(erro);
}

/**
 * Gera os pares (inicio, fim) de cada ocorrencia dentro do periodo.
 *
 * Mesma regra da funcao Postgres: percorre dia a dia de `dataHoraInicio` ate
 * `dataHoraFim` e seleciona os que casam com `diasSemanaRecorrencia`
 * (0 = domingo). O horario vem do plano quando informado; senao, do inicio.
 */
export function gerarOcorrencias(
  e: EntradaAgendamento,
): Array<{ inicio: Date; fim: Date | null }> {
  if (!e.dataHoraFim || e.diasSemanaRecorrencia.length === 0) return [];

  const dias = new Set<number>(e.diasSemanaRecorrencia);
  const [hEntrada, mEntrada] = partesHora(
    e.planoEstadia?.horarioEntrada,
    e.dataHoraInicio,
  );
  const saida = e.planoEstadia?.horarioSaida ?? null;

  const resultado: Array<{ inicio: Date; fim: Date | null }> = [];
  const dia = new Date(
    e.dataHoraInicio.getFullYear(),
    e.dataHoraInicio.getMonth(),
    e.dataHoraInicio.getDate(),
  );
  const ultimo = new Date(
    e.dataHoraFim.getFullYear(),
    e.dataHoraFim.getMonth(),
    e.dataHoraFim.getDate(),
  );

  while (dia <= ultimo) {
    if (dias.has(dia.getDay())) {
      const inicio = new Date(
        dia.getFullYear(),
        dia.getMonth(),
        dia.getDate(),
        hEntrada,
        mEntrada,
      );
      let fim: Date | null = null;
      if (saida) {
        const [h, m] = saida.split(':').map(Number);
        fim = new Date(
          dia.getFullYear(),
          dia.getMonth(),
          dia.getDate(),
          h ?? 0,
          m ?? 0,
        );
      }
      resultado.push({ inicio, fim });
    }
    dia.setDate(dia.getDate() + 1);
  }

  return resultado;
}

function partesHora(
  hora: string | null | undefined,
  padrao: Date,
): [number, number] {
  if (!hora) return [padrao.getHours(), padrao.getMinutes()];
  const [h, m] = hora.split(':').map(Number);
  return [h ?? 0, m ?? 0];
}
