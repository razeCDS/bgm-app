/**
 * Enums espelhando os tipos `enum` do Postgres.
 *
 * O valor da union e exatamente a string aceita pelo banco; os mapas de
 * rotulo sao so para exibicao. Nunca envie rotulo para o Supabase.
 */

export type PorteAnimal = 'mini' | 'pequeno' | 'medio' | 'grande';
export type EspecieAnimal = 'canina' | 'felina';
export type SexoAnimal = 'femea' | 'macho';
export type TipoAgendamento = 'visita' | 'hotel' | 'creche';
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
export const TIPOS_AGENDAMENTO: TipoAgendamento[] = ['visita', 'hotel', 'creche'];
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

export const rotuloTipo: Record<TipoAgendamento, string> = {
  visita: 'Visita',
  hotel: 'Hotel',
  creche: 'Creche',
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

// ── Regras por tipo de agendamento ────────────────────────────────────────

/**
 * O plano de estadia descreve a **rotina diaria** (tipo de plano, total de
 * dias, horarios de entrada/saida) e so faz sentido na Creche.
 *
 * No Hotel a entrada e a saida sao o proprio periodo do agendamento, entao
 * nao ha plano — apenas o valor da estadia.
 */
export const exigePlanoEstadia = (t: TipoAgendamento) => t === 'creche';

/** Hotel e Creche sao estadias: registram valor e pertences. Visita nao. */
export const temEstadia = (t: TipoAgendamento) => t !== 'visita';

/** Recorrencia so existe para Creche. */
export const permiteRecorrencia = (t: TipoAgendamento) => t === 'creche';

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
