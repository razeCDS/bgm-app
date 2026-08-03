import { create } from 'zustand';

import { AuthFake, type AuthRepositorio, type Usuario } from './repositorio';

/**
 * Implementacao ativa da autenticacao.
 *
 * Para ligar o Supabase Auth, troque por `new AuthSupabase()`.
 */
export const authRepositorio: AuthRepositorio = new AuthFake();

interface EstadoSessao {
  usuario: Usuario | null;
  /** `false` ate a sessao inicial ser resolvida — o guard espera por isso. */
  pronto: boolean;
  carregar: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
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
}));
