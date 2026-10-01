import { rotuloPorte } from './enums';
import type {
  DiaSemana,
  EspecieAnimal,
  FormaPagamento,
  PorteAnimal,
  SexoAnimal,
  StatusAgendamento,
  TipoAgendamento,
  TipoPlano,
} from './enums';

/** Tabela `tutores`. */
export interface Tutor {
  id: string;
  nomeCompleto: string;
  endereco: string | null;
  rg: string | null;
  /** Aceita null no banco, mas o formulario do app exige preenchimento. */
  cpfCnpj: string | null;
  telefone: string | null;
  email: string | null;
}

/** Tabela `animais`. */
export interface Animal {
  id: string;
  tutorId: string;
  nome: string;
  raca: string | null;
  /**
   * A coluna e `text` no Postgres, mas o app trata a idade como numero:
   * convertida na leitura e serializada de volta como string.
   */
  idade: number | null;
  porte: PorteAnimal | null;
  peso: number | null;
  especie: EspecieAnimal | null;
  sexo: SexoAnimal | null;
  castrado: boolean | null;
  docil: boolean | null;
  observacoes: string | null;
  /** Preenchido quando a consulta embute `tutores(*)`. */
  tutor?: Tutor | null;
}

/** Tabela `veterinarios_info` (1:1 com `animais`). */
export interface VeterinarioInfo {
  id: string;
  animalId: string;
  nomeVeterinario: string | null;
  temEspecialidade: boolean | null;
  qualEspecialidade: string | null;
  telefoneVeterinario: string | null;
  nomeClinica: string | null;
  telefoneClinica: string | null;
  enderecoClinica: string | null;
}

/** Tabela `contatos_emergencia` (1:N com `animais`). */
export interface ContatoEmergencia {
  id: string;
  animalId: string;
  nome: string | null;
  parentesco: string | null;
  telefone: string | null;
  ordem: number | null;
}

/** Tabela `anamneses` (1:1 com `animais`). */
export interface Anamnese {
  id: string;
  animalId: string;
  doencaPreexistente: boolean | null;
  doencaQual: string | null;
  alergias: string | null;
  cuidadosEspeciais: boolean | null;
  cuidadosQual: string | null;
  tomaMedicacao: boolean | null;
  medicacaoQual: string | null;
  vermifugadoUltimoMes: boolean | null;
  dataVermifugo: Date | null;
  vacinadoEsteAno: boolean | null;
  dataVacinacao: Date | null;
  observacoes: string | null;
}

/**
 * Tabela `termos_consentimento` (1:1 com `animais`).
 *
 * Regra de negocio: os itens do termo (vacinas, vermifugo, antipulgas,
 * castracao) sao conferencia manual da equipe. Este registro **nunca**
 * bloqueia a criacao de um agendamento.
 */
export interface TermoConsentimento {
  id: string;
  animalId: string;
  aceito: boolean | null;
  dataAceite: Date | null;
  localAceite: string | null;
}

/**
 * Tabela `planos_estadia` (1:1 com `agendamentos`).
 *
 * Horarios sao `time` no Postgres — mantidos como "HH:mm" aqui.
 */
export interface PlanoEstadia {
  id?: string;
  agendamentoId?: string;
  tipoPlano: TipoPlano | null;
  totalDias: number | null;
  horarioEntrada: string | null;
  horarioSaida: string | null;
  formaPagamento: FormaPagamento | null;
  /**
   * Campo informativo — nao ha processamento de pagamento nesta fase.
   *
   * SEMANTICA POR TIPO:
   *  - Hotel: valor total da estadia inteira.
   *  - Creche: valor da DIARIA.
   *
   * A diferenca importa porque o plano e 1:1 com o agendamento, e numa serie
   * recorrente ele e copiado para cada ocorrencia. Se guardasse o valor do
   * pacote, somar as ocorrencias devolveria o total multiplicado pelo numero
   * de dias. Valor de pacote fechado ainda nao e modelado.
   */
  valorTotal: number | null;
}

/** Tabela `pertences_deixados` (1:1 com `agendamentos`). */
export interface PertencesDeixados {
  id?: string;
  agendamentoId?: string;
  temCaminha: boolean | null;
  corCaminha: string | null;
  temRoupa: boolean | null;
  corRoupa: string | null;
  temBrinquedo: boolean | null;
  qualBrinquedo: string | null;
  racao: string | null;
  quantidade: string | null;
  vezes: string | null;
  observacoes: string | null;
}

/** Tabela `agendamentos`. */
export interface Agendamento {
  id: string;
  /**
   * Animais atendidos, via `agendamento_animais`.
   *
   * Um tutor pode reservar para mais de um cao no mesmo periodo, entao o
   * vinculo e N:N. A protecao contra dupla reserva mora na juncao
   * (`excl_animal_sem_sobreposicao_juncao`) e continua valendo por animal.
   */
  animalIds: string[];
  tipo: TipoAgendamento;
  dataHoraInicio: Date;
  /** Opcional no banco: existe agendamento sem data final definida. */
  dataHoraFim: Date | null;
  status: StatusAgendamento;
  recorrente: boolean;
  diasSemanaRecorrencia: DiaSemana[];
  /**
   * Agrupa as ocorrencias geradas por uma mesma regra de recorrencia.
   * Todas as ocorrencias de uma serie compartilham este id.
   */
  agendamentoRecorrenciaId: string | null;
  observacoes: string | null;
  /** Id do evento espelhado no Google Agenda. Nulo = ainda nao espelhado. */
  googleCalendarEventId: string | null;
  /**
   * Ultima falha ao espelhar no Google, ou null se a ultima tentativa deu
   * certo. Preenchido pela Edge Function `sincronizar-agenda`.
   *
   * Existe porque falha de sync NUNCA invalida o agendamento — ele continua
   * valido no banco. Sem exibir este campo, a equipe so descobriria o
   * problema pelo cliente batendo na porta, ja que o Google e hoje a unica
   * visao por data.
   */
  googleSyncErro: string | null;
  // Relacionamentos embutidos
  animais?: Animal[];
  planoEstadia?: PlanoEstadia | null;
  pertencesDeixados?: PertencesDeixados | null;
}

/** Agregado exibido na ficha completa do animal. */
export interface FichaAnimal {
  animal: Animal;
  tutor: Tutor;
  veterinario: VeterinarioInfo | null;
  anamnese: Anamnese | null;
  termo: TermoConsentimento | null;
  contatos: ContatoEmergencia[];
}

/** Filtros combinaveis da aba Agendamentos. `null` = sem filtro. */
export interface FiltroAgendamentos {
  animalId: string | null;
  tutorId: string | null;
  tipo: TipoAgendamento | null;
  status: StatusAgendamento | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}

export const FILTRO_VAZIO: FiltroAgendamentos = {
  animalId: null,
  tutorId: null,
  tipo: null,
  status: null,
  dataInicio: null,
  dataFim: null,
};

export const filtroEstaVazio = (f: FiltroAgendamentos) =>
  Object.values(f).every((v) => v == null);

export const quantidadeFiltrosAtivos = (f: FiltroAgendamentos) =>
  Object.values(f).filter((v) => v != null).length;

/** Linha resumida usada nos cards da aba Caes. */
export function resumoAnimal(a: Animal): string {
  return [
    a.raca,
    a.porte ? rotuloPorte[a.porte] : null,
    a.idade != null ? `${a.idade} ${a.idade === 1 ? 'ano' : 'anos'}` : null,
  ]
    .filter((x): x is string => !!x)
    .join(' · ');
}
