import { create } from 'zustand';

import { authRepositorio } from '../../lib/repositorios';
import type { Usuario } from './repositorio';

/**
 * Sessao do usuario.
 *
 * A implementacao ativa (fake ou Supabase) e escolhida em
 * `src/lib/repositorios.ts` — este store nao decide nada sobre isso.
 */
interface EstadoSessao {
  usuario: Usuario | null;
  /** `false` ate a sessao inicial ser resolvida — o guard espera por isso. */
  pronto: boolean;
  carregar: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  /** Uso interno: reage a mudancas vindas do proprio Supabase. */
  definirUsuario: (u: Usuario | null) => void;
}

export const useSessao = create<EstadoSessao>((set) => ({
  usuario: null,
  pronto: false,

  carregar: async () => {
    const usuario = await authRepositorio.usuarioAtual();
    set({ usuario, pronto: true });
  },

  entrar: async (email, senha) => {
    const usuario = await authRepositorio.entrar(email, senha);
    set({ usuario });
  },

  sair: async () => {
    await authRepositorio.sair();
    set({ usuario: null });
  },

  definirUsuario: (usuario) => set({ usuario, pronto: true }),
}));

/**
 * O supabase-js restaura a sessao do cookie de forma assincrona e renova o
 * token em segundo plano. Sem escutar esses eventos, um token expirado com
 * a pagina aberta deixaria a tela "logada" sem conseguir ler nada.
 *
 * So no navegador: no Next este modulo tambem e avaliado no servidor (para
 * gerar o HTML inicial), onde nao ha sessao. La, o evento inicial marcaria
 * `pronto: true` com usuario nulo — e o HTML do servidor deixaria de bater
 * com o primeiro render do navegador (erro de hidratacao).
 *
 * No modo em memoria a inscricao simplesmente nao existe (no-op).
 */
if (typeof window !== 'undefined') {
  authRepositorio.aoMudarSessao?.((usuario) => {
    useSessao.getState().definirUsuario(usuario);
  });
}
