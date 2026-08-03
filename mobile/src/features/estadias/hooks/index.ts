import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { create } from 'zustand';

import { estadiasRepositorio } from '../../../lib/repositorios';
import type { EntradaAgendamento } from '../types/entrada-agendamento';
import type {
  Animal,
  FichaAnimal,
  FiltroAgendamentos,
  Tutor,
} from '../types/modelos';
import { FILTRO_VAZIO } from '../types/modelos';

/**
 * Implementacao ativa — escolhida em `src/lib/repositorios.ts` conforme
 * as credenciais do Supabase estejam configuradas ou nao.
 */
const repositorio = estadiasRepositorio;

// ── Chaves de cache ───────────────────────────────────────────────────────

export const chaves = {
  tutores: ['tutores'] as const,
  animais: (busca: string) => ['animais', busca] as const,
  ficha: (id: string) => ['ficha', id] as const,
  agendamentos: (f: FiltroAgendamentos) => ['agendamentos', f] as const,
  agendamento: (id: string) => ['agendamento', id] as const,
};

// ── Estado de UI (equivale aos NotifierProviders do Riverpod) ─────────────

interface EstadoBusca {
  busca: string;
  definir: (v: string) => void;
  limpar: () => void;
}

export const useBuscaAnimais = create<EstadoBusca>((set) => ({
  busca: '',
  definir: (busca) => set({ busca }),
  limpar: () => set({ busca: '' }),
}));

interface EstadoFiltro {
  filtro: FiltroAgendamentos;
  definir: (f: FiltroAgendamentos) => void;
  limparTudo: () => void;
}

export const useFiltroAgendamentos = create<EstadoFiltro>((set) => ({
  filtro: FILTRO_VAZIO,
  definir: (filtro) => set({ filtro }),
  limparTudo: () => set({ filtro: FILTRO_VAZIO }),
}));

// ── Consultas ─────────────────────────────────────────────────────────────

export const useTutores = () =>
  useQuery({
    queryKey: chaves.tutores,
    queryFn: () => repositorio.listarTutores(),
  });

export function useAnimais() {
  const busca = useBuscaAnimais((s) => s.busca);
  return useQuery({
    queryKey: chaves.animais(busca),
    queryFn: () => repositorio.listarAnimais(busca),
  });
}

export const useFichaAnimal = (animalId: string) =>
  useQuery({
    queryKey: chaves.ficha(animalId),
    queryFn: () => repositorio.obterFicha(animalId),
    enabled: !!animalId,
  });

export function useAgendamentos() {
  const filtro = useFiltroAgendamentos((s) => s.filtro);
  return useQuery({
    queryKey: chaves.agendamentos(filtro),
    queryFn: () => repositorio.listarAgendamentos(filtro),
  });
}

/**
 * Agendamentos que tocam o mes de [referencia], para a aba Agenda.
 *
 * Reaproveita o filtro por intervalo que o repositorio ja expoe — nenhuma
 * mudanca foi necessaria na camada de dados. Nao usa o filtro global da aba
 * Agendamentos de proposito: um filtro esquecido la deixaria o calendario
 * misteriosamente vazio.
 */
export function useAgendamentosDoMes(referencia: Date) {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fim = new Date(
    referencia.getFullYear(),
    referencia.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const filtro: FiltroAgendamentos = {
    ...FILTRO_VAZIO,
    dataInicio: inicio,
    dataFim: fim,
  };

  return useQuery({
    queryKey: ['agenda-mes', inicio.toISOString()],
    queryFn: () => repositorio.listarAgendamentos(filtro),
  });
}

export const useAgendamento = (id: string | undefined) =>
  useQuery({
    queryKey: chaves.agendamento(id ?? ''),
    queryFn: () => repositorio.obterAgendamento(id!),
    enabled: !!id,
  });

// ── Mutacoes ──────────────────────────────────────────────────────────────

/** Recarrega o que a escrita afeta — equivale ao invalidate do Riverpod. */
function useInvalidar() {
  const qc = useQueryClient();
  return {
    animais: () => {
      qc.invalidateQueries({ queryKey: ['animais'] });
      qc.invalidateQueries({ queryKey: ['tutores'] });
    },
    fichas: () => qc.invalidateQueries({ queryKey: ['ficha'] }),
    agendamentos: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] });
      qc.invalidateQueries({ queryKey: ['agendamento'] });
    },
  };
}

export function useSalvarTutor() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (t: Tutor) => repositorio.salvarTutor(t),
    onSuccess: inv.animais,
  });
}

export function useSalvarAnimal() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (a: Animal) => repositorio.salvarAnimal(a),
    onSuccess: () => {
      inv.animais();
      inv.fichas();
    },
  });
}

export function useSalvarFicha() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (f: FichaAnimal) => repositorio.salvarFicha(f),
    onSuccess: () => {
      inv.fichas();
      inv.animais();
    },
  });
}

export function useCriarAgendamento() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (e: EntradaAgendamento) => repositorio.criarAgendamento(e),
    onSuccess: inv.agendamentos,
  });
}

export function useAtualizarAgendamento() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (v: { id: string; entrada: EntradaAgendamento }) =>
      repositorio.atualizarAgendamento(v.id, v.entrada),
    onSuccess: inv.agendamentos,
  });
}

export function useCancelarAgendamento() {
  const inv = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => repositorio.cancelarAgendamento(id),
    onSuccess: inv.agendamentos,
  });
}
