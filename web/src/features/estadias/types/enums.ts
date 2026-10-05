/**
 * Enums espelhando os tipos `enum` do Postgres.
 *
 * O valor da union e exatamente a string aceita pelo banco; os mapas de
 * rotulo sao so para exibicao. Nunca envie rotulo para o Supabase.
 */

export type PorteAnimal = 'mini' | 'pequeno' | 'medio' | 'grande';
export type EspecieAnimal = 'canina' | 'felina';
export type SexoAnimal = 'femea' | 'macho';
export type ServicoAgendamento =
  | 'creche'
  | 'hotel'
  | 'banho'
  | 'tosa_higienica'
  | 'consulta'
  | 'visita';
export type StatusAgendamento =
  | 'solicitado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';
export type TipoPlano = 'diaria' | 'semanal' | 'mensal' | 'anual';
export type FormaPagamento = 'pix' | 'dinheiro';

export const PORTES: PorteAnimal[] = ['mini', 'pequeno', 'medio', 'grande'];
export const ESPECIES: EspecieAnimal[] = ['canina', 'felina'];
export const SEXOS: SexoAnimal[] = ['femea', 'macho'];
/** Ordem de exibicao: no formulario, nos chips e no titulo do Google. */
export const SERVICOS: ServicoAgendamento[] = [
  'creche',
  'hotel',
  'banho',
  'tosa_higienica',
  'consulta',
  'visita',
];
export const STATUS_AGENDAMENTO: StatusAgendamento[] = [
  'solicitado',
  'confirmado',
  'em_andamento',
  'concluido',
  'cancelado',
];
export const TIPOS_PLANO: TipoPlano[] = ['diaria', 'semanal', 'mensal', 'anual'];
export const FORMAS_PAGAMENTO: FormaPagamento[] = ['pix', 'dinheiro'];

export const rotuloPorte: Record<PorteAnimal, string> = {
  mini: 'Mini',
  pequeno: 'Pequeno',
  medio: 'Médio',
  grande: 'Grande',
};

export const rotuloEspecie: Record<EspecieAnimal, string> = {
  canina: 'Canina',
  felina: 'Felina',
};

export const rotuloSexo: Record<SexoAnimal, string> = {
  femea: 'Fêmea',
  macho: 'Macho',
};

/** Rotulo curto: chips da lista, filtro e titulo do evento no Google. */
export const rotuloServico: Record<ServicoAgendamento, string> = {
  creche: 'Creche',
  hotel: 'Hotel',
  banho: 'Banho',
  tosa_higienica: 'Tosa higiênica',
  consulta: 'Consulta',
  visita: 'Visita',
};

/** Texto do checkbox no formulario, onde cabe o detalhe. */
export const rotuloServicoCompleto: Record<ServicoAgendamento, string> = {
  ...rotuloServico,
  creche: 'Creche — período integral',
};

export const rotuloStatus: Record<StatusAgendamento, string> = {
  solicitado: 'Solicitado',
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const rotuloTipoPlano: Record<TipoPlano, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
  anual: 'Anual',
};

export const rotuloFormaPagamento: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
};

// ── Regras por servico ────────────────────────────────────────────────────
//
// Um agendamento reune um ou mais servicos. Os PRINCIPAIS (Creche, Hotel,
// Visita) definem a estrutura dele — de onde vem o horario, se ha plano, se
// ha pertences. Os EXTRAS (Banho, Tosa, Consulta) so somam um servico e um
// valor, sozinhos ou junto de Creche/Hotel.
//
// Todas as regras recebem a LISTA de servicos: e a combinacao que decide.

/**
 * Nao mudam depois de criado: trocar Creche por Hotel mudaria a estrutura
 * de horario e invalidaria plano, pertences e a propria serie recorrente.
 * Para trocar, cancela-se e cria-se outro. Extras entram e saem livremente.
 */
export const SERVICOS_PRINCIPAIS: ServicoAgendamento[] = ['creche', 'hotel', 'visita'];

export const ePrincipal = (s: ServicoAgendamento) => SERVICOS_PRINCIPAIS.includes(s);

export const SERVICOS_EXTRAS: ServicoAgendamento[] = ['banho', 'tosa_higienica', 'consulta'];

/**
 * Extras de um Hotel podem ser marcados num dia especifico da estadia (o
 * banho do dia 20). Na Creche nao precisa: cada dia ja e uma ocorrencia
 * propria, e o extra vai direto nela.
 */
export const permiteDiaEspecifico = (s: ServicoAgendamento[]) => s.includes('hotel');

/**
 * O plano de estadia descreve a **rotina diaria** (tipo de plano, total de
 * dias, horarios de entrada/saida) e so faz sentido na Creche.
 *
 * No Hotel a entrada e a saida sao o proprio periodo do agendamento, entao
 * nao ha plano.
 */
export const exigePlanoEstadia = (s: ServicoAgendamento[]) => s.includes('creche');

/** Hotel e Creche sao estadias: o cao passa o dia (ou dias) e deixa pertences. */
export const temPertences = (s: ServicoAgendamento[]) =>
  s.includes('creche') || s.includes('hotel');

/** Recorrencia so existe com Creche. */
export const permiteRecorrencia = (s: ServicoAgendamento[]) => s.includes('creche');

/** Visita e so para conhecer o espaco: nao tem valor. */
export const servicoTemValor = (s: ServicoAgendamento) => s !== 'visita';

/**
 * Combinacoes permitidas. Retorna a mensagem do erro, ou `null`.
 *
 * Olha os servicos DISTINTOS: um Banho em dois dias do Hotel e o mesmo
 * servico. Repeticao no mesmo dia e checada em `validarAgendamento`.
 *
 *  - Creche e Hotel se excluem: um tem horario diario, o outro um periodo
 *    continuo — juntos, nao haveria de onde tirar o horario.
 *  - Visita fica sozinha.
 *
 * Espelha o trigger `validar_servicos_agendamento` do banco.
 */
export function erroCombinacao(lista: ServicoAgendamento[]): string | null {
  const s = [...new Set(lista)];
  if (s.length === 0) return 'Selecione ao menos um serviço.';
  if (s.includes('creche') && s.includes('hotel')) {
    return 'Creche e Hotel não podem ser marcados juntos.';
  }
  if (s.includes('visita') && s.length > 1) {
    return 'Visita não pode ser combinada com outros serviços.';
  }
  return null;
}

/** Marcar `servico` junto dos ja marcados formaria uma combinacao invalida? */
export const servicoIncompativel = (
  servico: ServicoAgendamento,
  marcados: ServicoAgendamento[],
) => !marcados.includes(servico) && erroCombinacao([...marcados, servico]) !== null;

// ── Dias da semana ────────────────────────────────────────────────────────

/**
 * Convencao do Postgres (`extract(dow from ...)`): 0 = domingo ... 6 = sabado.
 *
 * Atencao: `Date.getDay()` do JS usa a MESMA convencao (0 = domingo), entao
 * aqui nao ha conversao — diferente do Dart, cujo `weekday` e 1 = segunda.
 */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DIAS_SEMANA: DiaSemana[] = [0, 1, 2, 3, 4, 5, 6];

export const rotuloDiaSemana: Record<DiaSemana, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const abreviadoDiaSemana: Record<DiaSemana, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

/** Dia da semana de uma data, na convencao do Postgres. */
export const diaSemanaDe = (d: Date): DiaSemana => d.getDay() as DiaSemana;
