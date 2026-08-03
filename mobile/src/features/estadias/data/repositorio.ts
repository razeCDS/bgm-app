import type { EntradaAgendamento } from '../types/entrada-agendamento';
import type {
  Agendamento,
  Animal,
  FichaAnimal,
  FiltroAgendamentos,
  Tutor,
} from '../types/modelos';

/**
 * Contrato de acesso a dados do modulo Estadias.
 *
 * Duas implementacoes: `RepositorioFake` (em memoria, usada enquanto a
 * integracao com o Supabase nao esta ligada) e `RepositorioSupabase`.
 */
export interface EstadiasRepositorio {
  // ── Tutores ──
  listarTutores(): Promise<Tutor[]>;
  /** Insere quando `id` esta vazio; caso contrario atualiza. */
  salvarTutor(tutor: Tutor): Promise<Tutor>;

  // ── Animais ──
  listarAnimais(busca?: string): Promise<Animal[]>;
  obterFicha(animalId: string): Promise<FichaAnimal>;
  /** Insere quando `id` esta vazio; caso contrario atualiza. */
  salvarAnimal(animal: Animal): Promise<Animal>;
  /** Grava veterinario, anamnese, termo e contatos de uma vez. */
  salvarFicha(ficha: FichaAnimal): Promise<FichaAnimal>;

  // ── Agendamentos ──
  listarAgendamentos(filtro: FiltroAgendamentos): Promise<Agendamento[]>;
  obterAgendamento(id: string): Promise<Agendamento>;
  /**
   * Todas as ocorrencias de uma serie, em ordem cronologica — inclusive as
   * canceladas, para a equipe enxergar o historico completo da recorrencia.
   */
  listarOcorrencias(recorrenciaId: string): Promise<Agendamento[]>;
  /**
   * Cria o agendamento. Quando a entrada gera recorrencia, produz uma
   * ocorrencia por dia marcado no periodo e devolve todas (compartilhando
   * o mesmo `agendamentoRecorrenciaId`).
   */
  criarAgendamento(entrada: EntradaAgendamento): Promise<Agendamento[]>;
  atualizarAgendamento(
    id: string,
    entrada: EntradaAgendamento,
  ): Promise<Agendamento>;
  /** Cancelamento e mudanca de status — o registro nunca e apagado. */
  cancelarAgendamento(id: string): Promise<Agendamento>;
  /**
   * Cancela de uma vez as ocorrencias da serie que comecam em `aPartirDe` ou
   * depois. As anteriores ficam intactas: elas ja aconteceram, e reescreve-las
   * apagaria o historico de frequencia do animal.
   *
   * Devolve as ocorrencias efetivamente canceladas.
   */
  cancelarSerie(
    recorrenciaId: string,
    aPartirDe: Date,
  ): Promise<Agendamento[]>;
}
